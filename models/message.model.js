import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
    content : { type: String, required: true },
    flatID: { type: mongoose.Schema.Types.ObjectId, ref: "flats", required: true },
    senderID: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    atCreated: {
        type: Date,
        default: Date.now
    }

});
const Message = mongoose.model("Message", messageSchema);
export default Message;
