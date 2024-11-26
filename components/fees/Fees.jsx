import React, { useState } from 'react';
import axios from 'axios';

export default function Fees({ id }) {
  // State to store the transaction data
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to fetch transaction details from the API
  const fetchTransactionDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/queries/find-single-byid/${id}`);
      setTransactionDetails(response.data.query);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate the total fees if transaction details exist
  const calculateTotal = () => {
    return transactionDetails?.fees?.reduce((total, fee) => total + fee.feesAmount, 0) || 0;
  };

  return (
    <div className="">
      <button
        onClick={fetchTransactionDetails}
        className=" text-xs px-2 py-1  bg-red-500 text-white rounded-md shadow-md hover:bg-red-600"
      >
        {loading ? 'Loading...' : ' Transaction Details'}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold text-gray-800">Transaction Details</h2>
            <table className="mt-4 w-full border border-gray-300 rounded-lg overflow-hidden shadow-md">
  <thead className="bg-blue-500 text-white">
    <tr>
      <th className="px-4 py-3 text-left text-sm font-medium">Fee Type</th>
      <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
    </tr>
  </thead>
  <tbody>
    {transactionDetails.fees.map((fee, index) => (
      <tr
        key={index}
        className={index % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-100'}
      >
        <td className="px-4 py-3 text-sm text-gray-700 border-b">{fee.feesType}</td>
        <td className="px-4 py-3 text-sm text-gray-700 border-b">₹ {fee.feesAmount.toFixed(2)}</td>
        <td className="px-4 py-3 text-sm text-gray-700 border-b">
          {new Date(fee.transactionDate).toLocaleDateString()}
        </td>
      </tr>
    ))}
  </tbody>
</table>


            <div className="mt-4 text-right text-xl font-semibold text-gray-800">
              Total: ${calculateTotal()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
