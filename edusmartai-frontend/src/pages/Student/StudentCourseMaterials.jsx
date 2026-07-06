// src/pages/Student/StudentCourseMaterials.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import studentApi from "../../api/studentApi";
import Card from "../../components/UI/Card";
import { buildFileUrl } from "../../utils/fileUrl";

const StudentCourseMaterials = () => {
  const { courseId } = useParams();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // FIX: studentApi.getCourseMaterials already returns r.data (the array),
        // so DON'T destructure { data } here.
        const data = await studentApi.getCourseMaterials(courseId);
        setMaterials(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load materials", err);
        setError("Unable to load materials for this course.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [courseId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Course Materials
        </h1>
        <p className="text-sm text-slate-500">
          All files shared by your lecturer for this course.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-none bg-white/70 shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-slate-500">
            Loading materials...
          </div>
        ) : materials.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-slate-500">
            <span className="text-lg font-medium">No materials yet.</span>
            <span className="text-sm">
              Your lecturer hasn&apos;t uploaded any files for this course.
            </span>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {materials.map((material) => (
              <article
                key={material.id}
                className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm"
              >
                <header className="mb-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {material.title}
                  </h2>
                  {material.uploaded_at && (
                    <p className="text-xs text-slate-400">
                      Uploaded{" "}
                      {new Date(material.uploaded_at).toLocaleString()}
                    </p>
                  )}
                </header>

                {material.description && (
                  <p className="mb-3 text-sm text-slate-600">
                    {material.description}
                  </p>
                )}

                <div className="mt-auto space-y-2">
                  <p className="text-xs font-medium text-slate-500">Files</p>
                  {material.files && material.files.length > 0 ? (
                    <ul className="space-y-1">
                      {material.files.map((file) => (
                        <li key={file.id}>
                          <a
                            // FIX: use buildFileUrl so /uploads/... is resolved
                            // against your backend host (http://localhost:8000)
                            href={buildFileUrl(file.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span role="img" aria-label="file">
                                📄
                              </span>
                              <span className="truncate">
                                {file.file_name}
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Download
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No files attached.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentCourseMaterials;
