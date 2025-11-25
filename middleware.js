import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = req.nextUrl.clone();

  // If user is logged in and opens /signin → redirect according to usertype
  if (token && url.pathname === "/signin") {
    if (token.usertype === "2") url.pathname = "/main";
    else if (token.usertype === "1") url.pathname = "/branch";
    else if (token.usertype === "0") url.pathname = "/staff";
    else url.pathname = "/"; // fallback
    return NextResponse.redirect(url);
  }

  // If NO token and protected routes → send to signin
  if (!token && (url.pathname.startsWith("/main") || url.pathname.startsWith("/branch") || url.pathname.startsWith("/staff"))) {
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  const usertype = token?.usertype;

  if (url.pathname.startsWith("/main") && usertype !== "2") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (url.pathname.startsWith("/branch") && usertype !== "1") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (url.pathname.startsWith("/staff") && usertype !== "0") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/main/:path*", "/branch/:path*", "/staff/:path*", "/signin"],
};
