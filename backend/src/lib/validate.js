// backend/src/lib/validate.js
import mongoose from "mongoose";

// Mongoose throws a CastError on malformed ids, which the controllers were
// turning into a 500. Callers use this to answer 400 instead.
export const isValidObjectId = (id) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

// Compares a Mongoose ObjectId array against an id of either type.
export const containsId = (list = [], id) =>
  list.some((item) => String(item?._id ?? item) === String(id));
