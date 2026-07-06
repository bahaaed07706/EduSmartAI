import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import studentApi from "../../api/studentApi";
import Card from "../../components/UI/Card";

const CourseAttendance = () => {
  const { courseId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    studentApi
      .getCourseAttendance(courseId)
      .then((res) => {
        // If axiosClient returns response.data directly,
        // `res` is already the JSON object: { records, summary }
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load attendance.");
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading attendance...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-500">No attendance data.</p>;
  }

  const records = data.records ?? [];
  const summary = data.summary ?? {
    total_sessions: 0,
    present_count: 0,
    absent_count: 0,
    attendance_rate: null,
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Attendance Summary
          </h3>
          <p className="text-xs text-slate-500">
            Overview of your attendance in this course.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-[11px] uppercase text-slate-500">Sessions</p>
            <p className="text-lg font-semibold text-slate-800">
              {summary.total_sessions}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Present</p>
            <p className="text-lg font-semibold text-emerald-600">
              {summary.present_count}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Absent</p>
            <p className="text-lg font-semibold text-rose-500">
              {summary.absent_count}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Rate</p>
            <p className="text-lg font-semibold text-primary">
              {summary.attendance_rate != null
                ? `${summary.attendance_rate.toFixed(1)}%`
                : "-"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">
          Attendance Details
        </h3>
        <div className="max-h-80 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left py-1 px-1">Date</th>
                <th className="text-left py-1 px-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1 px-1">{r.date}</td>
                  <td className="py-1 px-1 capitalize">
                    {r.status === "present" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600">
                        Present
                      </span>
                    )}
                    {r.status === "absent" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600">
                        Absent
                      </span>
                    )}
                    {r.status === "late" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600">
                        Late
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="py-2 text-center text-slate-400"
                  >
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CourseAttendance;
