import mongoose, { Schema } from "mongoose";

const AdminSchema = new Schema(

    {
        name: { type: String, required: true },
        mobile: { type: Number, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        branch: { type: String, required: true },
        status: { type: Boolean, required: true, default: true },
        usertype: { type: String, enum: ["0", "1", "2"], default: "0", required: true },
        franchisestaff: {
            type: String,
            enum: ["0", "1"],
            required: true,
            default: "0"
        },
        defaultdata: { type: String, required: true, default: "admin" },

    },
    { timestamps: true }
);

const AdminModel =
    mongoose.models.admin3 || mongoose.model("admin3", AdminSchema);

export default AdminModel