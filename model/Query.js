import mongoose, { Schema } from "mongoose";

const querySchema = new Schema({
    userid: {
        type: String,

        default: "null"
    },
    referenceid: {
        type: String,

        default: "null"
    },
    suboption: {
        type: String,

        default: "null"
    },
    demo: {
        type: Boolean,
        default: false
    },


    studentName: {
        type: String,
    },

    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Not_Defined'],

    },

    category: {
        type: String,
        enum: ['General', 'ST', 'SC', 'OBC', 'Other', 'Not_Defined'],

    },

    studentContact: {
        phoneNumber: { type: String, default: "Not_Provided" },
        whatsappNumber: { type: String, default: "Not_Provided" },
        address: { type: String, default: "Not_Provided" },
        city: { type: String, default: "Not_Provided" },
    },



    // New ---
    qualification: {
        type: String,

        default: "Not_Provided"
    },
    profession: {
        type: String,

    },
    professiontype: {
        type: String,

        default: "null"

    },

    reference_name: {
        type: String,

        default: "null"
    },
    // ---




    courseInterest: {
        type: String,

        default: "Not_Provided"
    },
    deadline: {
        type: String,

        default: "Not_Provided"
    },
    lastDeadline: {
        type: String,
        default: "Not_Provided"
    },

    assignedTo: {
        type: String,
        default: "Not-Assigned",

    },
    assignedsenthistory: {
        type: [String],
        default: []
    },
    assignedreceivedhistory: {
        type: [String],
        default: []
    },

    assignedToreq: {
        type: String,
        default: "Not-Assigned",

    },
    fees: [
        {
            feesType: { type: String, default: "Not_Provided" },
            feesAmount: { type: Number, default: 0 },
            transactionDate: { type: Date, default: Date.now },
        },
    ],
    total: {
        type: Number,
        default: 0,
    },
    assignedTostatus: {
        type: Boolean,
        default: false
    },

    branch: {
        type: String,
        default: "Not_Provided"
    },
    lastgrade: {
        type: String,

        default: 'Null',

    },
    lastmessage: {
        type: String,
        default: "null",
        required: true
    },
    lastactionby: {
        type: String,
        default: "null",
        required: true
    },

    autoclosed: {
        type: String,
        enum: ["open", "close"],
        default: "open"
    },
    addmission: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
    },
    defaultdata: {
        type: String,

        default: "query"
    }
}, { timestamps: true });

querySchema.pre('save', function (next) {
    // Check if deadline has been modified
    if (this.isModified('deadline')) {
        // Set lastDeadline to today's date
        this.lastDeadline = new Date(); // Store today's date in lastDeadline
    }
    next();
});

querySchema.pre('save', function (next) {
    this.total = this.fees.reduce((sum, fee) => sum + fee.feesAmount, 0);
    next();
});

const QueryModel =

    mongoose.models.Queries40 || mongoose.model('Queries40', querySchema);

export default QueryModel;
