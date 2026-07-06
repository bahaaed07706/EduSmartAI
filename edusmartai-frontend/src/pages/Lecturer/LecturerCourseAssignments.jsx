// src/pages/Lecturer/LecturerCourseAssignments.jsx
import React from "react";
import CourseAssessmentTypePage from "./CourseAssessmentTypePage";

const LecturerCourseAssignments = () => {
  return (
    <CourseAssessmentTypePage
      type="assignment"
      singularLabel="Assignment"
      pluralLabel="Assignments"
      pageDescription="Create, edit, grade, and review assignment submissions for this course."
      defaultMaxMarks={20}
      defaultWeight={5}
      emptyStateText="No assignments defined for this course yet."
      createCardTitle="Create Assignment"
      listCardTitle="Assignments"
      filePlaceholder="Link to assignment brief or template"
    />
  );
};

export default LecturerCourseAssignments;
