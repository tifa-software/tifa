import mongoose, { Schema } from "mongoose";

const DailyTaskSchema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "admin2", 
      required: true 
    },
    date: { 
      type: String, 
      required: true,
      index: true
    },
    dayStatus: {
      type: String,
      enum: ['open', 'closed'],
      default: 'closed'
    },
    dayOpenedAt: {
      type: Date
    },
    dayClosedAt: {
      type: Date
    },
    completedCount: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    pendingCount: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    // Today's queries
    todayQueries: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "AllQueries6" 
      }
    ],
    // Past due queries
    pastDueQueries: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "AllQueries6" 
      }
    ],
    // Completed queries (worked on today)
    completedQueries: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "AllQueries6" 
      }
    ],
    // Pending queries for today
    pendingTodayQueries: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "AllQueries6" 
      }
    ],
    // Pending past due queries
    pendingPastDueQueries: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "AllQueries6" 
      }
    ],
    branch: { 
      type: String,
      required: true
    },
    notes: { 
      type: String 
    },
    // Detailed statistics
    stats: {
      totalAssigned: { type: Number, default: 0 },
      todayQueries: { type: Number, default: 0 },
      pastDueQueries: { type: Number, default: 0 },
      completedToday: { type: Number, default: 0 },
      pendingToday: { type: Number, default: 0 },
      pendingPastDue: { type: Number, default: 0 }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add virtual for total queries
DailyTaskSchema.virtual('totalQueries').get(function() {
  return this.todayQueries.length + this.pastDueQueries.length;
});

// Add virtual for completion percentage
DailyTaskSchema.virtual('completionPercentage').get(function() {
  const total = this.todayQueries.length + this.pastDueQueries.length;
  return total > 0 ? Math.round((this.completedQueries.length / total) * 100) : 0;
});

// Compound indexes for faster queries
DailyTaskSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyTaskSchema.index({ branch: 1, date: 1 });
// Index for day status queries
DailyTaskSchema.index({ date: 1, dayStatus: 1 });

const DailyTaskModel =
  mongoose.models.DailyTask || mongoose.model("DailyTask", DailyTaskSchema);

export default DailyTaskModel;
