// src/pages/Lecturer/LecturerCourseStudents.jsx
// صفحة عرض الطلاب مع تنبؤات الذكاء الاصطناعي وإدخال الخصائص الكاملة (OULAD + AXI)
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import lecturerApi from "../../api/lecturerApi";
import predictionApi from "../../api/predictionApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const LecturerCourseStudents = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [predictionResult, setPredictionResult] = useState(null);

    // Full feature input form combining OULAD + AXI
    const [fullFeatures, setFullFeatures] = useState({
        // OULAD Features (No Exam Leakage)
        score_tma: 0,
        score_cma: 0,
        pass_rate: 0,
        weighted_grade: 0,
        sum_click: 0,
        days_active: 0,
        num_of_prev_attempts: 0,

        // AXI Behavioral Features
        raised_hands: 50,
        visited_resources: 50,
        announcements_view: 50,
        discussion: 50,
        absence_days: "Under-7",
        parent_satisfaction: "Good",
    });

    const loadStudents = useCallback(async () => {
        try {
            setLoading(true);
            const data = await lecturerApi.getCourseStudents(courseId);
            setStudents(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to load students", e);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setEditMode(false);
        setMessage("");
        setPredictionResult(null);

        // Pre-fill form with existing data
        setFullFeatures({
            // OULAD
            score_tma: student.features?.score_tma || 0,
            score_cma: student.features?.score_cma || 0,
            pass_rate: student.features?.pass_rate || 0,
            weighted_grade: student.features?.weighted_grade || 0,
            sum_click: student.features?.sum_click || 0,
            days_active: student.features?.date || 0, // 'date' in DB maps to 'days_active'
            num_of_prev_attempts: student.features?.num_of_prev_attempts || 0,

            // AXI from behavior
            raised_hands: student.behavior?.raised_hands || 50,
            visited_resources: student.behavior?.visited_resources || 50,
            announcements_view: student.behavior?.announcements_view || 50,
            discussion: student.behavior?.discussion || 50,
            absence_days: student.behavior?.absence_days || "Under-7",
            parent_satisfaction: student.behavior?.parent_satisfaction || "Good",
        });
    };

    const handleSaveAndPredict = async () => {
        if (!selectedStudent) return;
        try {
            setSaving(true);
            setMessage("");

            // 1. Send data to Backend (OuladRawInput schema)
            const rawInput = {
                score_tma: fullFeatures.score_tma,
                score_cma: fullFeatures.score_cma,
                pass_rate: fullFeatures.pass_rate,
                weighted_grade: fullFeatures.weighted_grade,
                sum_click: fullFeatures.sum_click,
                active_days: fullFeatures.days_active,
                prev_failures: fullFeatures.num_of_prev_attempts
            };

            // Call prediction (which might return prediction result directly or just preprocess)
            // If using `predictOuladRaw`, ensure backend endpoint returns what we expect.
            // Actually, we usually save features THEN predict via `saveFullStudentFeatures` in the backend logic?
            // The original code called `predictOuladRaw` THEN `saveFullStudentFeatures`. 
            // `saveFullStudentFeatures` in backend (lecturer_routes) calls `predict_oulad` internally.
            // So we just need to pass the full features to `saveFullStudentFeatures`.
            // We can skip `predictOuladRaw` if it's just for preprocessing, unless UI needs it.
            // Let's keep `predictOuladRaw` call if it verifies data, but we need to ensure the payload matches.

            await predictionApi.predictOuladRaw(rawInput);

            // 2. Prepare features to save and predict
            const featuresToSave = {
                ...fullFeatures,
                // Ensure key names match `StudentFullFeatureInput` in schema
                date: fullFeatures.days_active,
                // other keys (score_tma, score_cma, pass_rate, weighted_grade) already match
            };

            // 3. Save to DB and Get Prediction
            const result = await lecturerApi.saveFullStudentFeatures(
                courseId,
                selectedStudent.id,
                featuresToSave
            );

            setPredictionResult(result);
            setMessage("✅ تم حفظ الخصائص وحساب التنبؤات بنجاح!");
            setEditMode(false);

            // Reload students
            await loadStudents();

            // Re-select student
            const updated = students.find((s) => s.id === selectedStudent.id);
            if (updated) {
                setSelectedStudent(updated);
            }
        } catch (e) {
            console.error("Failed to save features", e);
            setMessage(`❌ خطأ: ${e.response?.data?.detail || e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const updateFeature = (key, value) => {
        setFullFeatures((prev) => ({ ...prev, [key]: value }));
    };

    const getPredictionBadge = (prediction) => {
        if (!prediction) return null;
        const isSuccess = prediction.result === "ناجح" || prediction.prediction === 1;
        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${isSuccess ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}>
                {isSuccess ? "✅ ناجح" : "⚠️ معرض للخطر"}
                {prediction.probability && (
                    <span className="text-[10px] opacity-70">
                        ({(prediction.probability * 100).toFixed(0)}%)
                    </span>
                )}
            </span>
        );
    };

    const getAXIBadge = (axi) => {
        if (!axi || !axi.level) return null;
        const colors = {
            H: "bg-emerald-100 text-emerald-700",
            M: "bg-yellow-100 text-yellow-700",
            L: "bg-red-100 text-red-700",
        };
        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${colors[axi.level] || "bg-slate-100 text-slate-700"
                }`}>
                📊 {axi.level_ar || axi.level}
            </span>
        );
    };

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                        إدخال البيانات والتنبؤ - Data Entry & Prediction
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                        طلاب المقرر مع التنبؤات الذكية
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        أدخل خصائص الطالب (OULAD + AXI) واحصل على نتائج التنبؤ
                    </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/lecturer/courses/${courseId}`)}>
                    ← العودة للمقرر
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
                {/* Student List */}
                <Card className="border border-slate-100 bg-white shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <span>👥</span>
                            <span>قائمة الطلاب ({students.length})</span>
                        </h3>
                        <Button size="sm" variant="outline" onClick={loadStudents}>🔄</Button>
                    </div>

                    {loading ? (
                        <p className="text-sm text-slate-500">جاري التحميل...</p>
                    ) : (
                        <div className="max-h-[65vh] overflow-auto space-y-2">
                            {students.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelectStudent(s)}
                                    className={`cursor-pointer rounded-xl border p-3 transition-all ${selectedStudent?.id === s.id
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{s.email}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {getPredictionBadge(s.oulad_prediction)}
                                            {getAXIBadge(s.axi_prediction)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {students.length === 0 && (
                                <p className="text-center text-sm text-slate-400 py-8">لا يوجد طلاب مسجلين</p>
                            )}
                        </div>
                    )}
                </Card>

                {/* Student Details & Input Form */}
                <Card className="border border-slate-100 bg-white shadow-sm">
                    {selectedStudent ? (
                        <div className="space-y-5">
                            {/* Student Header */}
                            <div className="border-b border-slate-100 pb-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{selectedStudent.name}</h3>
                                        <p className="text-sm text-slate-500">{selectedStudent.email}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                            <span className="rounded-full bg-slate-100 px-2 py-1">🎂 {selectedStudent.age} سنة</span>
                                            <span className="rounded-full bg-slate-100 px-2 py-1">📍 {selectedStudent.city}</span>
                                            <span className="rounded-full bg-slate-100 px-2 py-1">📚 {selectedStudent.academic_year}</span>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                                        TEACHER MODE ACTIVE
                                    </div>
                                </div>
                            </div>

                            {/* AI Predictions Display */}
                            {!editMode && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-100">
                                        <h4 className="text-xs font-semibold uppercase text-blue-800 mb-2">🔮 تنبؤ OULAD (النجاح/الرسوب)</h4>
                                        {selectedStudent.oulad_prediction ? (
                                            <div className="space-y-2">
                                                <div className="text-xl font-bold">{getPredictionBadge(selectedStudent.oulad_prediction)}</div>
                                                <p className="text-[11px] text-slate-600">
                                                    احتمالية النجاح: <strong>{((selectedStudent.oulad_prediction.probability || 0) * 100).toFixed(1)}%</strong>
                                                </p>
                                            </div>
                                        ) : <p className="text-sm text-slate-400">لا توجد بيانات - أدخل الخصائص للتنبؤ</p>}
                                    </div>

                                    <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 border border-purple-100">
                                        <h4 className="text-xs font-semibold uppercase text-purple-800 mb-2">📊 تنبؤ AXI (المستوى السلوكي)</h4>
                                        {selectedStudent.axi_prediction ? (
                                            <div className="space-y-2">
                                                <div className="text-xl font-bold">{getAXIBadge(selectedStudent.axi_prediction)}</div>
                                                <div className="flex gap-2 text-[10px] text-slate-600">
                                                    <span>L: {((selectedStudent.axi_prediction.prob_l || 0) * 100).toFixed(0)}%</span>
                                                    <span>M: {((selectedStudent.axi_prediction.prob_m || 0) * 100).toFixed(0)}%</span>
                                                    <span>H: {((selectedStudent.axi_prediction.prob_h || 0) * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        ) : <p className="text-sm text-slate-400">لا توجد بيانات - أدخل الخصائص للتنبؤ</p>}
                                    </div>
                                </div>
                            )}

                            {/* Toggle Edit Mode Button */}
                            {!editMode && (
                                <Button onClick={() => setEditMode(true)} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                    ✏️ إدخال/تعديل الخصائص والتنبؤ
                                </Button>
                            )}

                            {/* Full Features Input Form */}
                            {editMode && (
                                <div className="space-y-4">
                                    {/* OULAD Features Section */}
                                    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-4">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-4">
                                            <span>📊</span> New Student Entry <span className="text-[10px] font-normal text-blue-600 ml-2">OULAD MODEL</span>
                                        </h4>
                                        <div className="text-xs text-blue-600 mb-4 bg-blue-100/50 p-2 rounded">
                                            ⚠️ Note: Exam scores are NOT used for prediction to avoid data leakage. Enter pre-exam metrics.
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Weighted Grade (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                                    value={fullFeatures.weighted_grade} onChange={(e) => updateFeature("weighted_grade", parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">TMA Score (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.score_tma} onChange={(e) => updateFeature("score_tma", parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">CMA Score (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.score_cma} onChange={(e) => updateFeature("score_cma", parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Pass Rate (%)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.pass_rate} onChange={(e) => updateFeature("pass_rate", parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Clicks (Interaction)</label>
                                                <input type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.sum_click} onChange={(e) => updateFeature("sum_click", parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Days Active</label>
                                                <input type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.days_active} onChange={(e) => updateFeature("days_active", parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Prev Failures</label>
                                                <input type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.num_of_prev_attempts} onChange={(e) => updateFeature("num_of_prev_attempts", parseInt(e.target.value) || 0)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AXI Behavioral Features Section */}
                                    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-4">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-800 mb-4">
                                            <span>🎯</span> xAPI Student Entry <span className="text-[10px] font-normal text-purple-600 ml-2">AXI CNN MODEL</span>
                                        </h4>

                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Raised Hands (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.raised_hands} onChange={(e) => updateFeature("raised_hands", parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Visited Resources (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.visited_resources} onChange={(e) => updateFeature("visited_resources", parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Announcements View (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.announcements_view} onChange={(e) => updateFeature("announcements_view", parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Discussion (0-100)</label>
                                                <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.discussion} onChange={(e) => updateFeature("discussion", parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Student Absence Days</label>
                                                <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.absence_days} onChange={(e) => updateFeature("absence_days", e.target.value)}>
                                                    <option value="Under-7">Under 7 Days</option>
                                                    <option value="Above-7">Above 7 Days</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-600 font-medium">Parent Satisfaction</label>
                                                <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={fullFeatures.parent_satisfaction} onChange={(e) => updateFeature("parent_satisfaction", e.target.value)}>
                                                    <option value="Good">Good</option>
                                                    <option value="Bad">Bad</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button onClick={handleSaveAndPredict} disabled={saving}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                                            {saving ? "⏳ جاري الحفظ والتنبؤ..." : "🔮 Predict Performance (OULAD + AXI)"}
                                        </Button>
                                        <Button variant="outline" onClick={() => setEditMode(false)}>إلغاء</Button>
                                    </div>
                                </div>
                            )}

                            {/* Prediction Results */}
                            {predictionResult && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-emerald-800">🎯 نتائج التنبؤ</h4>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {predictionResult.oulad_prediction && (
                                            <div className="rounded-lg bg-white p-3 border border-emerald-100">
                                                <p className="text-[11px] text-slate-500 uppercase">OULAD Prediction</p>
                                                <p className="text-lg font-bold text-slate-800">{predictionResult.oulad_prediction.label_ar}</p>
                                                <p className="text-xs text-slate-600">احتمالية: {((predictionResult.oulad_prediction.probability || 0) * 100).toFixed(1)}%</p>
                                            </div>
                                        )}

                                        {predictionResult.axi_prediction && (
                                            <div className="rounded-lg bg-white p-3 border border-emerald-100">
                                                <p className="text-[11px] text-slate-500 uppercase">AXI Prediction</p>
                                                <p className="text-lg font-bold text-slate-800">{predictionResult.axi_prediction.label_ar}</p>
                                                <div className="text-[10px] text-slate-600 flex gap-2">
                                                    <span>L: {((predictionResult.axi_prediction.probabilities?.L || 0) * 100).toFixed(0)}%</span>
                                                    <span>M: {((predictionResult.axi_prediction.probabilities?.M || 0) * 100).toFixed(0)}%</span>
                                                    <span>H: {((predictionResult.axi_prediction.probabilities?.H || 0) * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Message */}
                            {message && (
                                <div className={`rounded-lg p-3 text-sm ${message.includes("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                                    {message}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <span className="text-4xl mb-3">👆</span>
                            <p className="text-sm text-slate-500">اختر طالباً من القائمة لإدخال خصائصه</p>
                            <p className="text-xs text-slate-400 mt-1">Select a student to enter features and get AI predictions</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default LecturerCourseStudents;
