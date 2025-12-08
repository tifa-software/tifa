import dbConnect from '@/lib/dbConnect';
import AdminModel from '@/model/Admin';
import axios from 'axios';
import { NextResponse } from 'next/server';

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

        const body = await request.json();
        const { eventName, message } = body || {};

        if (!eventName || !eventName.trim()) {
            return NextResponse.json(
                { message: 'Event name is required.' },
                { status: 400 }
            );
        }

        if (!message || !message.trim()) {
            return NextResponse.json(
                { message: 'Message is required.' },
                { status: 400 }
            );
        }

        const finalEventName = eventName.trim();
        const finalMessage = message.trim();

        await dbConnect();

        const admins = await AdminModel.find(
            { mobile: { $exists: true, $ne: "" } },
            { name: 1, mobile: 1 }
        );

        console.log(`Sending event "${finalEventName}" to ${admins.length} staff members.`);

        const sentMessages = [];

        for (const admin of admins) {
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
                            name: "staff_event_message",
                            language: { code: "en_US" }, 
                            components: [
                               
                                {
                                    type: "header",
                                    parameters: [
                                        {
                                            type: "text",
                                            text: finalEventName,
                                        },
                                    ],
                                },
                              
                                {
                                    type: "body",
                                    parameters: [
                                        {
                                            type: "text",
                                            text: finalMessage,
                                        },
                                    ],
                                },
                            ],
                        },
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
                    id: response.data?.messages?.[0]?.id || null,
                });

                console.log(`Sent to ${admin.name} (${formattedMobile}):`, response.data);

            } catch (error) {
                console.error(
                    `Error sending to ${admin.name} (${formattedMobile}):`,
                    error.response?.data || error.message
                );

                sentMessages.push({
                    name: admin.name,
                    mobile: formattedMobile,
                    status: "Failed",
                    error: error.response?.data || error.message,
                });
            }
        }

        return NextResponse.json(
            {
                message: 'Event template message job completed.',
                eventName: finalEventName,
                totalRecipients: admins.length,
                sentSummary: sentMessages,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Fatal API Error:", error);
        return NextResponse.json(
            {
                message: "Internal Server Error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
