// src/pages/Lecturer/LecturerCourseProjects.jsx
import React from "react";
import CourseAssessmentTypePage from "./CourseAssessmentTypePage";

const LecturerCourseProjects = () => {
  return (
    <CourseAssessmentTypePage
      type="project"
      singularLabel="Project"
      pluralLabel="Projects"
      pageDescription="Define project briefs, manage milestones, and grade project submissions."
      defaultMaxMarks={100}
      defaultWeight={20}
      emptyStateText="No projects defined for this course yet."
      createCardTitle="Create Project"
      listCardTitle="Projects"
      filePlaceholder="Project brief / PDF link"
    />
  );
};

export default LecturerCourseProjects;
