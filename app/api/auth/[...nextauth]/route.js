export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import AdminModel from "@/model/Admin";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {},
      async authorize(credentials) {
        const { email, password } = credentials;
        await dbConnect();

        const admin = await AdminModel.findOne({ email }).lean();
        if (!admin) return null;
        // const valid = await bcrypt.compare(password, admin.password);
        // if (!valid) return null;

        return {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
          usertype: admin.usertype,
          franchisestaff: admin.franchisestaff,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.usertype = user.usertype;
        token.franchisestaff = user.franchisestaff; // ⬅️ Store in token
      }
      return token;
    },
    async session({ session, token }) {
      session.user.usertype = token.usertype;
      session.user.franchisestaff = token.franchisestaff;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/signin" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
