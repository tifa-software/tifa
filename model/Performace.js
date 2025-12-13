import mongoose, { Schema } from "mongoose";

const PerformanceSchema = new Schema(
    {

        userid: { type: String, required: true },
        mobile: { type: String, required: true },

        totalcount: { type: String, required: true, default: "0" },
        workcount: { type: String, required: true, default: "0" },
        pendingcount: { type: String, required: true, default: "0" },
        enrollcount: { type: String, required: true, default: "0" },

        actiondate: { type: Date, required: true },

        defaultdata: { type: String, required: true, default: "performance" }

    },
    { timestamps: true }
);

const PerformanceModel =
    mongoose.models.performance || mongoose.model("performance", PerformanceSchema);

export default PerformanceModel