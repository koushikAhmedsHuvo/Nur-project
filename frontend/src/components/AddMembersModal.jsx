// frontend/src/components/AddMembersModal.jsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { searchUsers, addGroupMembers } from "../lib/api";
import { FaSearch, FaUserPlus, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import debounce from "lodash/debounce";

export default function AddMembersModal({ groupId, groupName, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const queryClient = useQueryClient();

  const searchUsersDebounced = debounce(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, 500);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsersDebounced(query);
  };

  const handleAddMember = (user) => {
    if (!selectedMembers.find(m => m._id === user._id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(m => m._id !== userId));
  };

  const { mutate: addMembers, isPending } = useMutation({
    mutationFn: () => addGroupMembers(groupId, selectedMembers.map(m => m._id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`${selectedMembers.length} member(s) added!`);
      onClose();
    },
    onError: () => toast.error("Failed to add members"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-box w-full max-w-md bg-base-100 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Add Members to "{groupName}"</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <FaTimes />
          </button>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Search Users</span>
          </label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
            <input
              type="text"
              className="input input-bordered w-full pl-10"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by name or email..."
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-[calc(100%-2rem)] bg-base-100 shadow-lg rounded-box border max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="p-2 hover:bg-base-200 cursor-pointer flex items-center gap-3"
                  onClick={() => handleAddMember(user)}
                >
                  <img src={user.profilePicture} className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs opacity-70">{user.email}</p>
                  </div>
                  <FaUserPlus className="ml-auto text-primary" />
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedMembers.length > 0 && (
          <div className="mb-4">
            <label className="label">
              <span className="label-text">Selected ({selectedMembers.length})</span>
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-base-200 rounded-lg">
              {selectedMembers.map((member) => (
                <div key={member._id} className="badge badge-primary gap-2 p-3">
                  <img src={member.profilePicture} className="w-4 h-4 rounded-full" />
                  {member.fullName}
                  <button className="btn btn-xs btn-circle btn-ghost" onClick={() => handleRemoveMember(member._id)}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={addMembers} disabled={selectedMembers.length === 0 || isPending}>
            {isPending ? "Adding..." : `Add ${selectedMembers.length} Member(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}