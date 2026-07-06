// src/api/predictionApi.js
// API calls for AI predictions (OULAD and AXI models)
import axiosClient from "./axiosClient";

const predictionApi = {
    // Predict student performance using OULAD model
    predictOulad: (studentFeatures) =>
        axiosClient
            .post("/predictions/oulad", studentFeatures)
            .then((r) => r.data),

    // Predict using raw data with server-side preprocessing (Feature Engineering)
    predictOuladRaw: (rawData) =>
        axiosClient
            .post("/predictions/oulad/preprocess", rawData)
            .then((r) => r.data),

    // Predict student level using AXI model
    predictAxi: (axiData) =>
        axiosClient
            .post("/predictions/axi", null, { params: axiData })
            .then((r) => r.data),

    // Predict for a specific student by ID
    predictForStudent: (studentId, courseId) =>
        axiosClient
            .post(`/predictions/student/${studentId}/course/${courseId}`)
            .then((r) => r.data),
};

export default predictionApi;
