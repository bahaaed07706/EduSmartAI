// src/api/fileApi.js
import axiosClient from "./axiosClient";

const fileApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return axiosClient
      .post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((r) => r.data); // { url, filename, original_name }
  },
};

export default fileApi;
