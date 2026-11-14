// frontend/src/components/SearchBar.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers, sendFriendRequest } from "../lib/api";
import { FaSearch, FaTimes, FaUserPlus } from "react-icons/fa";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";
import debounce from "lodash/debounce";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sendingRequest, setSendingRequest] = useState({});
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const searchRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const searchUsersDebounced = debounce(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await searchUsers(searchQuery);
      setResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 500);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    searchUsersDebounced(value);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleUserClick = (userId) => {
    clearSearch();
    navigate(`/chat/${userId}`);
  };

  const handleSendRequest = async (userId, e) => {
    e.stopPropagation();
    setSendingRequest((prev) => ({ ...prev, [userId]: true }));
    try {
      await sendFriendRequest(userId);
      toast.success("Friend request sent!");
      // Remove from results or mark as sent
      setResults((prev) =>
        prev.filter((user) => user._id !== userId)
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    } finally {
      setSendingRequest((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xs">
      {/* Search Input */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          onFocus={() => setIsOpen(true)}
          placeholder="Search users..."
          className="input input-bordered w-full pl-10 pr-10 h-9 text-sm"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 mt-2 w-full bg-base-100 rounded-xl shadow-2xl border border-base-300 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-base-content/60 text-sm">
              No users found
            </div>
          ) : (
            results.map((user) => {
              const isFriend = authUser?.friends?.includes(user._id);
              return (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer transition-colors border-b border-base-300 last:border-b-0"
                >
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() => handleUserClick(user._id)}
                  >
                    {/* Avatar */}
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full">
                        <img
                          src={user.profilePicture || "https://avatar.iran.liara.run/public/1.png"}
                          alt={user.fullName}
                        />
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.fullName}</p>
                      <p className="text-xs text-base-content/60 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Friend Request Button */}
                  {!isFriend && user._id !== authUser?._id && (
                    <button
                      onClick={(e) => handleSendRequest(user._id, e)}
                      disabled={sendingRequest[user._id]}
                      className="btn btn-primary btn-xs gap-1"
                    >
                      {sendingRequest[user._id] ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <>
                          <FaUserPlus className="size-3" />
                          Add
                        </>
                      )}
                    </button>
                  )}
                  {isFriend && (
                    <span className="badge badge-success badge-sm">Friend</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}