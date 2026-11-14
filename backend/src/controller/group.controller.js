// backend/controller/group.controller.js
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import { isValidObjectId, containsId } from "../lib/validate.js";

const MEMBER_FIELDS = "fullName profilePicture";

// Loads the group and confirms the caller belongs to it. Returns null after
// having already answered the request, so callers just `if (!group) return;`.
const loadGroupForMember = async (req, res) => {
  const { groupId } = req.params;

  if (!isValidObjectId(groupId)) {
    res.status(400).json({ message: "Invalid group id" });
    return null;
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404).json({ message: "Group not found" });
    return null;
  }

  if (!containsId(group.members, req.user._id)) {
    res.status(403).json({ message: "Not a member of this group" });
    return null;
  }

  return group;
};

// CREATE GROUP
export const createGroup = async (req, res) => {
  try {
    const { name, description = "", memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name required" });
    }

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ message: "memberIds must be an array" });
    }

    const invalid = memberIds.filter((id) => !isValidObjectId(id));
    if (invalid.length) {
      return res.status(400).json({ message: "Invalid member id(s)", invalid });
    }

    const members = [...new Set([req.user._id.toString(), ...memberIds])];

    const group = await Group.create({
      name: name.trim(),
      description,
      createdBy: req.user._id,
      members,
    });

    // Populate members before sending response
    const populatedGroup = await Group.findById(group._id).populate("members", MEMBER_FIELDS);

    res.status(201).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET GROUPS
export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate("members", MEMBER_FIELDS);

    res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET MESSAGES
export const getGroupMessages = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;

    const messages = await GroupMessage.find({ group: group._id })
      .populate("sender", MEMBER_FIELDS)
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get group messages error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ADD MEMBERS
export const addMembers = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;

    const { memberIds = [] } = req.body;

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ message: "memberIds must be an array" });
    }

    const invalid = memberIds.filter((id) => !isValidObjectId(id));
    if (invalid.length) {
      return res.status(400).json({ message: "Invalid member id(s)", invalid });
    }

    memberIds.forEach((id) => {
      if (!containsId(group.members, id)) {
        group.members.push(id);
      }
    });

    await group.save();
    await group.populate("members", MEMBER_FIELDS);

    res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Add members error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// SEND GROUP MESSAGE
export const sendGroupMessage = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text required" });
    }

    const message = await GroupMessage.create({
      group: group._id,
      sender: req.user._id,
      text: text.trim(),
    });

    const populatedMsg = await message.populate("sender", MEMBER_FIELDS);
    res.status(201).json(populatedMsg);
  } catch (error) {
    console.error("Send group message error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
