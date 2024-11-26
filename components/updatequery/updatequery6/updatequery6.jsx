import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function UpdateQuery6({ query, audit }) {
  const queryid = query._id;
  const userid = query.userid;
  const [selectedOption, setSelectedOption] = useState('');
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState('');
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility state
  const [feesType, setFeesType] = useState('');
  const [feesAmount, setFeesAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]); // Default to today

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    setMessage(''); // Reset message when the option changes
    if (event.target.value === 'admission') {
      setIsModalOpen(true); // Open the modal when "Enroll" is selected
    }
  };

  const handleDeadlineChange = (event) => {
    setDeadline(event.target.value);
  };



  const handleModalSubmit = async () => {
    // API call for fees update
    const feesData = {
      id: queryid,
      
      fees: {
        feesType,
        feesAmount: parseFloat(feesAmount),
        transactionDate,
      },
    };

    try {
      const response = await axios.patch('/api/queries/fees', feesData);
      if (response.status === 200) {
        console.log('Fees updated successfully:', response.data);
        setIsModalOpen(false); // Close the modal after successful submission
        router.push("./")
      } else {
        console.error('Error updating fees:', response.statusText);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    // Prepare data to send to the backend for the audit update
    const data = {
      queryId: queryid,
      actionby: userid,
      oflinesubStatus: selectedOption,
      message:message, 
     
      deadline: deadline || undefined, // Include deadline if provided

    };

    // Handle status counts
    const statusCountsUpdate = {
      interested_but_not_proper_response: audit?.statusCounts?.interested_but_not_proper_response || 0,
    };



    try {
      // API call for audit update
      const auditResponse = await axios.patch('/api/audit/update', data);
      if (auditResponse.status === 200) {
        console.log('Audit updated successfully:', auditResponse.data);
        router.push("./")

        // window.location.reload();
      } else {
        console.error('Error updating audit:', auditResponse.statusText);
      }

      if (selectedOption === 'demo') {
          const queryUpdateData = {
            id: queryid,
            demo: true, // Set demo to true
          };
          const queryResponse = await axios.patch('/api/queries/update', queryUpdateData);
          if (queryResponse.status === 200) {
            console.log('Query updated with demo successfully:', queryResponse.data);
          } else {
            console.error('Error updating query for demo:', queryResponse.statusText);
          }
      } else if (selectedOption === 'not_interested') {
        const queryUpdateData = {
          id: queryid,
          autoclosed: 'close'
        };
        const queryResponse = await axios.patch('/api/queries/update', queryUpdateData);
        if (queryResponse.status === 200) {
          console.log('Query updated with admission successfully:', queryResponse.data);
        } else {
          console.error('Error updating query for admission:', queryResponse.statusText);
        }
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="mx-auto bg-white shadow-xl rounded-lg">
      <h3 className="text-xl font-semibold mb-2 text-indigo-700">Select a Status</h3>

      <div className="mb-6">
        <label htmlFor="statusSelect" className="block text-lg font-medium text-gray-700 mb-2">
          Interested Status:
        </label>
        <select
          id="statusSelect"
          value={selectedOption}
          onChange={handleOptionChange}
          className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#29234b] focus:border-[#29234b]"
        >
          <option value="" disabled>-- Select Interested Status --</option>
          <option value="admission">Enroll</option>
          <option value="demo">Demo</option>
          <option value="not_interested">Not Interested</option>
          <option value="response">Response</option>
        </select>
      </div>

      <div className="mb-6 transition-opacity duration-300 ease-in-out">
        <label htmlFor="deadline" className="block text-lg font-medium text-gray-700 mb-2">Deadline:</label>
        <input
          type="date"
          id="deadline"
          value={deadline}
          min={today} // Prevent selection of past dates
          onChange={handleDeadlineChange}
          className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#29234b] focus:border-[#29234b]"
        />
      </div>


        <div className="mb-6 transition-opacity duration-300 ease-in-out">
          <h4 className="text-lg font-semibold mb-3 text-[#29234b]">Message:</h4>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#29234b] focus:border-[#29234b]"
            rows="4"
            name="message"
            placeholder="Please enter your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      

      <button
        type="submit"
        className="mt-6 w-full py-3 bg-[#29234b] text-white font-semibold rounded-md hover:bg-[#29234b] transition-colors duration-200"
      >
        Submit
      </button>


       {/* Modal for Fees Update */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Update User Fees</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fees Type</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                value={feesType}
                onChange={(e) => setFeesType(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fees Amount</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded"
                value={feesAmount}
                onChange={(e) => setFeesAmount(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Transaction Date</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleModalSubmit}
                className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
              >
                Submit
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
