import { StreamChat } from "stream-chat";

const apiKey=process.env.STREAM_API_KEY;
const apiSecret=process.env.STREAM_API_SECRET;


if (!apiKey || !apiSecret){
    console.error("Api key or secret is missing");
}

const streamClient=StreamChat.getInstance(apiKey,apiSecret);

export const upsertStreamUser=async(userData)=>{
    try {
        await streamClient.upsertUser(userData);;
        return userData;
    } catch (error) {
        console.error("Error in upserting Stream User:",error)
    }
}


export const generateStreamToken = (userId) => {
  const userIdStr = userId.toString();
  // Let the caller answer with a real error instead of sending `undefined`.
  return streamClient.createToken(userIdStr);
};