import dbConnect from '@/lib/dbConnect';
import AdminModel from '@/model/Admin';
import axios from 'axios';
import { NextResponse } from 'next/server';

// ENV Variables
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '933988523111654';

export async function POST(request) {
    try {
        if (!WHATSAPP_API_TOKEN) {
            return NextResponse.json(
                { message: 'Error: WHATSAPP_API_TOKEN missing' },
                { status: 500 }
            );
        }

        // Database Connection
        await dbConnect();

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;

        // Birthday Admin Query
        const birthdayAdmins = await AdminModel.aggregate([
            {
                $project: {
                    name: 1,
                    mobile: 1,
                    dobDay: { $dayOfMonth: '$dob' },
                    dobMonth: { $month: '$dob' },
                }
            },
            {
                $match: {
                    dobDay: currentDay,
                    dobMonth: currentMonth,
                }
            }
        ]);

        console.log(`Found ${birthdayAdmins.length} birthdays today.`);

        const sentMessages = [];

        // Loop and Send WhatsApp Template Messages
        for (const admin of birthdayAdmins) {
            if (!admin.mobile) continue;

            const formattedMobile = admin.mobile.toString().replace(/^\+/, "");

            try {
                const response = await axios.post(
                    `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_ID}/messages`,
                    {
                        messaging_product: "whatsapp",
                        to: formattedMobile,
                        type: "template",
                        template: {
                            name: "birthdaywishes",
                            language: { code: "en" },
                            components: [
                                {
                                    type: "header",
                                    parameters: [
                                        {
                                            type: "text",
                                            text: admin.name || "Dear Friend"
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                sentMessages.push({
                    name: admin.name,
                    mobile: formattedMobile,
                    status: "Sent",
                    id: response.data.messages?.[0]?.id
                });

                console.log(`Sent to ${admin.name}:`, response.data);

            } catch (error) {
                console.error(`Error sending to ${admin.name}:`, error.response?.data || error.message);

                sentMessages.push({
                    name: admin.name,
                    mobile: formattedMobile,
                    status: "Failed",
                    error: error.response?.data || error.message
                });
            }
        }

        // Result Response
        return NextResponse.json(
            {
                message: 'Birthday message job completed.',
                totalBirthdays: birthdayAdmins.length,
                sentSummary: sentMessages
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Fatal API Error:", error);
        return NextResponse.json(
            {
                message: "Internal Server Error",
                error: error.message
            },
            { status: 500 }
        );
    }
}
