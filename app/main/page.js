"use client"
import React from 'react';
import Mainline from "@/components/Graph/MainLine"
import MainBar from "@/components/Graph/MainBar"
export default function Page() {

  return (
    <div className=" mx-auto p-6  rounded-lg bg-blue-50">

      <div className="grid gap-6 md:grid-cols-2 grid-cols-1 ">


        <div className=' md:col-span-2'>
          <Mainline />
        </div>

        <div className=' md:col-span-2'>

        <MainBar />

        </div>




      </div>
    </div>
  );
}
