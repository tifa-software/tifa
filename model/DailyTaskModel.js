import mongoose, { Schema } from "mongoose";

const DailyTaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "admin", required: true },
    date: { type: String, required: true },
    completedCount: { type: Number, required: true, default: 0 },
    pendingCount: { type: Number, required: true, default: 0 },
    completedQueries: [
      { type: Schema.Types.ObjectId, ref: "AllQueries6" }
    ],

    pendingQueries: [
      { type: Schema.Types.ObjectId, ref: "AllQueries6" }
    ],
    branch: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);


DailyTaskSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyTaskModel =
  mongoose.models.DailyTask || mongoose.model("DailyTask", DailyTaskSchema);

export default DailyTaskModel;
