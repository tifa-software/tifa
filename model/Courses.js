import mongoose, { Schema } from "mongoose";

const CourseSchema = new Schema(
    {
        course_name: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String, required: true,
        },

        defaultdata: { type: String, required: true, default: "Courses" }

    },
    { timestamps: true }
);

const CourseModel =
    mongoose.models.course1 || mongoose.model("course1", CourseSchema);

export default CourseModel