"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
export default function AllCourses() {
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]); // Store filtered courses
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // Current page
  const [itemsPerPage] = useState(10); // Number of items per page

  // Fetch category and course data on component load
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const categoryResponse = await axios.get("/api/CoursesCategory/fetchall/CoursesCategory");
        setCategories(categoryResponse.data.fetch);

        const courseResponse = await axios.get("/api/course/fetchall/courses");
        setAllCourses(courseResponse.data.fetch || []);
        setFilteredCourses(courseResponse.data.fetch || []); // Initially, all courses are displayed
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle category change and filter courses on the client-side
  const handleCategoryChange = (e) => {
    const selectedCategoryId = e.target.value;
    setSelectedCategory(selectedCategoryId);

    if (selectedCategoryId === "") {
      // If no category is selected, show all courses
      setFilteredCourses(allCourses);
    } else {
      // Filter courses by selected category
      const filtered = allCourses.filter((course) => course.category === selectedCategoryId);
      setFilteredCourses(filtered);
    }
    setCurrentPage(1); // Reset to the first page when category changes
  };

  // Find the category name by matching the category ID with the fetched categories
  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat._id === categoryId);
    return category ? category.category : "Unknown Category";
  };

  // Delete course by ID
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this course?");
    if (confirmDelete) {
      try {
        const response = await axios.delete("/api/course/delete", { data: { id } });
        alert(response.data.message); // Notify user of the result
        // Fetch updated course list after deletion
        const updatedCourses = allCourses.filter((course) => course._id !== id);
        setAllCourses(updatedCourses);
        setFilteredCourses(updatedCourses);
      } catch (error) {
        console.error("Error deleting course:", error);
        alert("There was an error deleting the course.");
      }
    }
  };

  // Calculate the courses for the current page
  const indexOfLastCourse = currentPage * itemsPerPage;
  const indexOfFirstCourse = indexOfLastCourse - itemsPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Total number of pages
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  return (
    <div className="shadow-lg rounded-md relative overflow-auto h-5/6 p-2 bg-white">
      {/* Category Filter Dropdown */}
      <div className="mb-4">
        <label htmlFor="category" className="mr-2 font-semibold">
          Filter by Category:
        </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={handleCategoryChange}
          className="border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.category}
            </option>
          ))}
        </select>
      </div>

      {/* Course Table */}
      <table className="w-full text-sm text-left text-gray-600 font-sans">
        <thead className="bg-[#29234b] text-white uppercase">
          <tr>
            <th scope="col" className="px-4 font-medium capitalize py-2">Course Name</th>
            <th scope="col" className="px-4 font-medium capitalize py-2">Category</th>
            <th scope="col" className="px-4 font-medium capitalize py-2">Description</th>
            <th scope="col" className="px-4 font-medium capitalize py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="4" className="px-6 py-4">
                <div className="flex justify-center items-center h-[300px]">
               <Loader/>
                </div>
              </td>
            </tr>
          ) : currentCourses.length > 0 ? (
            currentCourses.map((course) => (
              <tr
                key={course._id}
                className="border-b cursor-pointer hover:bg-gray-100 odd:bg-gray-50 even:bg-gray-100 transition-colors duration-200"
              >
                <td className="px-4 py-2 font-semibold text-gray-900 text-sm whitespace-nowrap">
                  {course.course_name}
                </td>
                <td className="px-4 py-2 text-[12px]">{getCategoryName(course.category)}</td>
                <td className="px-4 py-2 text-[12px] truncate max-w-[150px] relative group">
                  {course.description.slice(0, 50)}...
                  <span className="hidden group-hover:block fixed top-0 left-0 bg-white border border-gray-300 p-2 rounded-md shadow-lg z-10 ">
                    {course.description}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDelete(course._id)}
                    className="bg-red-600 text-white px-1 rounded-md text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                No Courses available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="flex absolute bottom-0 left-0 right-0 m-4 justify-between items-center mt-4">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-gray-200 px-4 py-2 rounded-md disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-gray-200 px-4 py-2 rounded-md disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
