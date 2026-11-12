import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ECGPrediction, PatientListItem, ECGClassCode } from '../types';
import {
  Activity,
  Upload,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  RotateCcw,
  User,
  Heart,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ShieldCheck,
  Stethoscope,
  Pill,
  ClipboardList,
  Building2,
  Calendar,
  ArrowRight,
  Clock,
  Gauge,
  Sliders,
  FileCheck2,
  Flame,
  Check
} from 'lucide-react';

interface Props {
  onNavigate?: (tab: string) => void;
  selectedPatientId?: number;
}

interface PrescriptionPreset {
  case_name: string;
  condition_code: ECGClassCode;
  doctor_name: string;
  hospital: string;
  patient_symptoms: string[];
  heart_rate: number;
  blood_pressure: string;
  pr_interval_ms: number;
  qrs_duration_ms: number;
  qt_interval_ms: number;
  st_segment: string;
  rhythm_type: string;
  prescribed_medications: string;
  clinical_impressions: string;
  urgency: string;
}

export const ECGPredictionPage: React.FC<Props> = ({ onNavigate, selectedPatientId }) => {
  // Navigation & Patient state
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [patientId, setPatientId] = useState<number | ''>(selectedPatientId || '');

  // Workflow Mode: 'prescription' (real-world healthcare) vs 'telemetry' (54-feature CSV / bioengineering)
  const [activeWorkflow, setActiveWorkflow] = useState<'prescription' | 'telemetry'>('prescription');

  // Prescription Form state
  const [selectedPresetCode, setSelectedPresetCode] = useState<string>('ARR');
  const [doctorName, setDoctorName] = useState<string>('Dr. Sarah Chen, MD, FACC (Cardiology)');
  const [hospitalName, setHospitalName] = useState<string>('Metropolitan Heart & Vascular Institute');
  const [heartRate, setHeartRate] = useState<number | ''>(88);
  const [bloodPressure, setBloodPressure] = useState<string>('134/86 mmHg');
  const [prInterval, setPrInterval] = useState<number | ''>(172);
  const [qrsDuration, setQrsDuration] = useState<number | ''>(132);
  const [qtInterval, setQtInterval] = useState<number | ''>(420);
  const [stSegment, setStSegment] = useState<string>('Normal / Isoelectric');
  const [prescribedMeds, setPrescribedMeds] = useState<string>('Metoprolol Succinate 25mg PO Daily, Magnesium Supplement 400mg');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'Palpitations during mild exertion',
    'Episodic chest fluttering',
    'Intermittent lightheadedness'
  ]);
  const [clinicalImpressions, setClinicalImpressions] = useState<string>(
    'Frequent premature ventricular ectopy noted on Lead II strip. Conduction delay with wide QRS (>120ms). Recommend 48-hr ambulatory Holter monitoring.'
  );

  // Uploaded file state
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);

  // Telemetry 54-parameter state
  const [featureInputs, setFeatureInputs] = useState<Record<string, string>>({});
  const [showTelemetryDetails, setShowTelemetryDetails] = useState<boolean>(false);

  // Status & loading states
  const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(true);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Prediction output
  const [predictionResult, setPredictionResult] = useState<ECGPrediction | null>(null);

  // Available common symptoms for quick tagging
  const COMMON_SYMPTOMS = [
    'Palpitations',
    'Chest Pain / Discomfort',
    'Shortness of Breath (Dyspnea)',
    'Dizziness / Lightheadedness',
    'Fatigue / Exhaustion',
    'Ankle Edema (Swelling)',
    'Orthopnea',
    'Syncope (Fainting)',
    'Rapid Heartbeat'
  ];

  // Presets definition
  const PRESETS: Record<string, PrescriptionPreset> = {
    ARR: {
      case_name: 'Ventricular Arrhythmia / Premature Ectopy',
      condition_code: 'ARR',
      doctor_name: 'Dr. Sarah Chen, MD, FACC (Cardiology)',
      hospital: 'Metropolitan Heart & Vascular Institute',
      patient_symptoms: ['Episodic chest fluttering', 'Palpitations during mild exertion', 'Intermittent lightheadedness'],
      heart_rate: 88,
      blood_pressure: '134/86 mmHg',
      pr_interval_ms: 172,
      qrs_duration_ms: 132,
      qt_interval_ms: 420,
      st_segment: 'Normal / Isoelectric',
      rhythm_type: 'Premature Ventricular Contractions (PVCs) with Conduction Delay',
      prescribed_medications: 'Metoprolol Succinate 25mg PO Daily, Magnesium Supplement 400mg',
      clinical_impressions: 'Frequent premature ventricular ectopy noted on Lead II strip. Conduction delay with wide QRS (>120ms). Recommend 48-hr ambulatory Holter monitoring.',
      urgency: 'Moderate Priority'
    },
    AFF: {
      case_name: 'Atrial Fibrillation with Rapid Ventricular Response',
      condition_code: 'AFF',
      doctor_name: 'Dr. Rajiv Mehta, MD (Electrophysiology)',
      hospital: 'Apex Cardiac Emergency Center',
      patient_symptoms: ['Sudden onset irregular heartbeat', 'Exertional dyspnea', 'Generalized exhaustion'],
      heart_rate: 128,
      blood_pressure: '142/92 mmHg',
      pr_interval_ms: 0,
      qrs_duration_ms: 94,
      qt_interval_ms: 380,
      st_segment: 'Non-specific ST depression (<1mm)',
      rhythm_type: 'Irregularly Irregular Supraventricular Rhythm (Absent P-Waves)',
      prescribed_medications: 'Diltiazem 30mg TID, Apixaban (Eliquis) 5mg PO BID',
      clinical_impressions: 'Chaotic baseline without discernible P waves; irregularly irregular RR intervals. High thromboembolic risk (CHA2DS2-VASc = 3). Initiated rate control and anticoagulation.',
      urgency: 'High Priority (Thromboembolic Risk)'
    },
    CHF: {
      case_name: 'Congestive Heart Failure / Ventricular Strain',
      condition_code: 'CHF',
      doctor_name: 'Dr. Amanda Torres, MD (Advanced Heart Failure)',
      hospital: 'University Cardiovascular Care Clinic',
      patient_symptoms: ['Bilateral ankle edema', 'Orthopnea (needs 3 pillows to sleep)', 'Paroxysmal nocturnal dyspnea'],
      heart_rate: 96,
      blood_pressure: '148/94 mmHg',
      pr_interval_ms: 195,
      qrs_duration_ms: 126,
      qt_interval_ms: 445,
      st_segment: 'ST depression with T-wave inversion (Strain Pattern)',
      rhythm_type: 'Sinus Tachycardia with Left Ventricular Strain & Delayed Conduction',
      prescribed_medications: 'Furosemide (Lasix) 40mg PO QAM, Sacubitril/Valsartan (Entresto) 24/26mg BID, Carvedilol 6.25mg BID',
      clinical_impressions: 'Chronic congestive heart failure with signs of volume overload. ECG shows ventricular repolarization abnormalities and strain pattern. LVEF estimated at 35%.',
      urgency: 'Urgent Clinical Attention'
    },
    NSR: {
      case_name: 'Normal Sinus Rhythm (Annual Preventive Exam)',
      condition_code: 'NSR',
      doctor_name: 'Dr. Marcus Thorne, MD (Preventive Cardiology)',
      hospital: 'CardioPulse Wellness Health Center',
      patient_symptoms: ['None (Routine cardiovascular health assessment)'],
      heart_rate: 72,
      blood_pressure: '118/76 mmHg',
      pr_interval_ms: 158,
      qrs_duration_ms: 86,
      qt_interval_ms: 395,
      st_segment: 'Normal / Isoelectric',
      rhythm_type: 'Normal Sinus Rhythm (Synchronized SA Node Activation)',
      prescribed_medications: 'Daily Omega-3 Fatty Acids, Multivitamin',
      clinical_impressions: 'Resting 12-lead ECG is within normal limits. Regular rate and rhythm, upright P waves in Lead II, normal intervals. No ischemic or conduction abnormalities.',
      urgency: 'Routine / Normal'
    }
  };

  // Initial load
  useEffect(() => {
    loadPatients();
    // Initialize 54 telemetry inputs
    const initial: Record<string, string> = {};
    for (let i = 1; i <= 54; i++) {
      initial[`feature_${i}`] = '';
    }
    setFeatureInputs(initial);
  }, []);

  const loadPatients = async () => {
    try {
      setIsLoadingPatients(true);
      const data = await api.getAllPatients();
      setPatients(data);
      if (data.length > 0 && !patientId) {
        setPatientId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load patients:', err);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === Number(patientId));

  // Switch prescription preset
  const handleSelectPreset = (code: string) => {
    const preset = PRESETS[code];
    if (!preset) return;
    setSelectedPresetCode(code);
    setDoctorName(preset.doctor_name);
    setHospitalName(preset.hospital);
    setHeartRate(preset.heart_rate);
    setBloodPressure(preset.blood_pressure);
    setPrInterval(preset.pr_interval_ms);
    setQrsDuration(preset.qrs_duration_ms);
    setQtInterval(preset.qt_interval_ms);
    setStSegment(preset.st_segment);
    setPrescribedMeds(preset.prescribed_medications);
    setSelectedSymptoms(preset.patient_symptoms);
    setClinicalImpressions(preset.clinical_impressions);
    setSuccessMessage(`Loaded clinical prescription preset: ${preset.case_name} (${preset.doctor_name})`);
    setErrorMessage(null);
  };

  // Toggle symptom tag
  const handleToggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  // Handle Prescription Document Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!patientId) {
      setErrorMessage('Please select a patient before uploading prescription.');
      return;
    }

    setPrescriptionFile(file);
    try {
      setIsUploadingFile(true);
      setErrorMessage(null);
      setSuccessMessage(`Analyzing uploaded prescription "${file.name}" with OCR & AI extraction...`);

      const result = await api.uploadPrescriptionFile(file, Number(patientId), clinicalImpressions);
      setPredictionResult(result);
      setSuccessMessage(`Prescription analyzed successfully: Diagnosed as ${result.condition_name} (${result.predicted_class}) with ${(result.confidence_score * 100).toFixed(1)}% confidence.`);
    } catch (err: any) {
      setErrorMessage(`Failed to analyze uploaded prescription: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Submit Prescription Analysis Request
  const handleAnalyzePrescription = async () => {
    if (!patientId) {
      setErrorMessage('Please select a registered patient before submitting.');
      return;
    }

    try {
      setIsPredicting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = {
        patient_id: Number(patientId),
        heart_rate: heartRate === '' ? undefined : Number(heartRate),
        blood_pressure: bloodPressure || undefined,
        pr_interval_ms: prInterval === '' ? undefined : Number(prInterval),
        qrs_duration_ms: qrsDuration === '' ? undefined : Number(qrsDuration),
        qt_interval_ms: qtInterval === '' ? undefined : Number(qtInterval),
        st_segment: stSegment || undefined,
        symptoms: selectedSymptoms,
        prescribed_medications: prescribedMeds || undefined,
        clinical_notes: `Doctor: ${doctorName} | Hospital: ${hospitalName} | Notes: ${clinicalImpressions}`,
        condition_preset: selectedPresetCode || undefined
      };

      const result = await api.analyzePrescription(payload);
      setPredictionResult(result);
      setSuccessMessage(`Prescription Diagnostic Complete: Model classifies cardiac waveform as ${result.condition_name} (${result.predicted_class}) with ${(result.confidence_score * 100).toFixed(1)}% confidence.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Prescription analysis failed.');
    } finally {
      setIsPredicting(false);
    }
  };

  // CSV File upload handler (Biomedical Telemetry mode)
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCSV(true);
      setErrorMessage(null);
      const parsed = await api.parseECGCSV(file);
      if (parsed && parsed.samples && parsed.samples.length > 0) {
        const firstSample = parsed.samples[0];
        const stringified: Record<string, string> = {};
        Object.entries(firstSample.features).forEach(([k, v]) => {
          stringified[k] = String(v);
        });
        setFeatureInputs(stringified);
        setSuccessMessage(
          `Imported ${parsed.total_samples} ECG sample(s) from CSV. Populated Sample #1${
            firstSample.label ? ` (Ground Truth: ${firstSample.label})` : ''
          }.`
        );
        setShowTelemetryDetails(true);
      }
    } catch (err: any) {
      setErrorMessage(`CSV Upload Error: ${err.message}`);
    } finally {
      setIsUploadingCSV(false);
      e.target.value = '';
    }
  };

  // Quick preset sample loader for Telemetry
  const handleLoadSample = async (code: ECGClassCode) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(`Loading verified clinical test sample for ${code}...`);
      const sampleData = await api.getSampleFeatures(code);
      if (sampleData && sampleData.features) {
        const stringified: Record<string, string> = {};
        Object.entries(sampleData.features).forEach(([k, v]) => {
          stringified[k] = String(v);
        });
        setFeatureInputs(stringified);
        setSuccessMessage(`Loaded genuine 54-feature sample for ${code} (${sampleData.condition_code})`);
        setShowTelemetryDetails(true);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to load sample: ${err.message}`);
    }
  };

  // Submit Raw 54-feature prediction
  const handleSubmitTelemetryPrediction = async () => {
    if (!patientId) {
      setErrorMessage('Please select a patient before submitting.');
      return;
    }

    const numericalFeatures: Record<string, number> = {};
    const invalidFeatures: string[] = [];

    for (let i = 1; i <= 54; i++) {
      const key = `feature_${i}`;
      const val = featureInputs[key];
      if (val === undefined || val === null || val.trim() === '') {
        invalidFeatures.push(key);
      } else {
        const parsed = Number(val);
        if (isNaN(parsed) || !isFinite(parsed)) {
          invalidFeatures.push(key);
        } else {
          numericalFeatures[key] = parsed;
        }
      }
    }

    if (invalidFeatures.length > 0) {
      setErrorMessage(
        `Please provide valid numerical values for all 54 features. Missing or invalid: ${invalidFeatures
          .slice(0, 5)
          .join(', ')}${invalidFeatures.length > 5 ? ` and ${invalidFeatures.length - 5} more` : ''}.`
      );
      return;
    }

    try {
      setIsPredicting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const result = await api.createECGPrediction({
        patient_id: Number(patientId),
        feature_values: numericalFeatures,
        notes: clinicalImpressions.trim() || undefined
      });

      setPredictionResult(result);
      setSuccessMessage(`Inference successful: Classified as ${result.condition_name} (${result.predicted_class})`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Prediction inference failed.');
    } finally {
      setIsPredicting(false);
    }
  };

  // Reset form
  const handleResetForm = () => {
    const empty: Record<string, string> = {};
    for (let i = 1; i <= 54; i++) {
      empty[`feature_${i}`] = '';
    }
    setFeatureInputs(empty);
    setPredictionResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPrescriptionFile(null);
  };

  // Generate official PDF report
  const handleGenerateReport = async () => {
    if (!predictionResult) return;
    try {
      setIsGeneratingReport(true);
      setErrorMessage(null);
      const res = await api.generateReportFromPrediction(predictionResult.id);
      if (res && res.id) {
        window.open(api.getReportPdfUrl(res.id), '_blank');
        setSuccessMessage('Official clinical report generated and downloaded.');
      } else {
        setSuccessMessage('Report generated successfully.');
      }
    } catch (err: any) {
      setErrorMessage(`Report Generation Failed: ${err.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Class badge helper
  const getClassBadge = (code: ECGClassCode) => {
    switch (code) {
      case 'NSR':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400',
          bar: 'bg-emerald-500',
          label: 'Normal Sinus Rhythm',
          urgency: 'Low Risk • Routine Care'
        };
      case 'ARR':
        return {
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          dot: 'bg-amber-400',
          bar: 'bg-amber-500',
          label: 'Cardiac Arrhythmia',
          urgency: 'Moderate Risk • Cardiology Referral'
        };
      case 'AFF':
        return {
          bg: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
          dot: 'bg-purple-400',
          bar: 'bg-purple-500',
          label: 'Atrial Fibrillation',
          urgency: 'High Risk • Immediate Anticoagulation Check'
        };
      case 'CHF':
        return {
          bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          dot: 'bg-rose-400',
          bar: 'bg-rose-500',
          label: 'Congestive Heart Failure',
          urgency: 'Critical • Urgent Clinical Attention'
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          bar: 'bg-slate-500',
          label: code,
          urgency: 'Standard Protocol'
        };
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Page Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono font-semibold">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>CLINICAL PRESCRIPTION & AI ECG DIAGNOSTIC SUITE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Medical Prescription Analysis & ECG Classification
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload a doctor's medical prescription slip or select an authentic hospital case. CardioPulse AI analyzes clinical vitals, medication regimens, and waveform intervals to run diagnosis through our calibrated Extra Trees classifier.
            </p>
          </div>

          {/* Model Performance Pill Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Extra Trees Accuracy</span>
                <span className="text-sm font-black font-mono text-teal-300">96.67%</span>
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Macro ROC-AUC</span>
                <span className="text-sm font-black font-mono text-cyan-300">0.9985</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Mode Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <button
              onClick={() => setActiveWorkflow('prescription')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeWorkflow === 'prescription'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Medical Prescription & Clinical Analysis (Recommended)</span>
            </button>
            <button
              onClick={() => setActiveWorkflow('telemetry')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeWorkflow === 'telemetry'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Biomedical Telemetry & 54-Feature CSV (Research)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetForm}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-teal-400" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* Main Grid: Left Inputs (7 Cols) & Right Results (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Clinical Input Engine */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section 1: Patient Selection Card */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">
                <User className="w-4 h-4" />
                <span>1. Select Clinical Patient Record</span>
              </div>
              <button
                onClick={() => onNavigate?.('patients')}
                className="text-[11px] font-mono text-cyan-400 hover:underline hover:text-cyan-300"
              >
                + Manage Patients
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-12">
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : '')}
                  disabled={isLoadingPatients}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-teal-500 transition shadow-inner"
                >
                  {isLoadingPatients ? (
                    <option value="">Loading patient registry...</option>
                  ) : patients.length === 0 ? (
                    <option value="">No registered patients found</option>
                  ) : (
                    patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.patient_id_code || `PAT-${p.id}`} — {p.full_name} ({p.age ? `${p.age} yrs` : 'Age N/A'}, {p.sex || 'Unknown'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {selectedPatient && (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-cyan-400 font-bold">{selectedPatient.patient_id_code || `PAT-${selectedPatient.id}`}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">{selectedPatient.full_name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400 font-mono">{selectedPatient.age} yrs / {selectedPatient.sex}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-teal-400">
                    Prior Tests: {selectedPatient.prediction_count || 1} ECG Run(s)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* WORKFLOW 1: MEDICAL PRESCRIPTION & CLINICAL SLIP ANALYSIS */}
          {activeWorkflow === 'prescription' && (
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              
              {/* Presets Header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>2. Quick Clinical Hospital Presets (One-Click Demonstrations)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Select any hospital slip to test</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Click a real hospital consultation prescription below to load verified clinical vitals and medication orders:
                </p>

                {/* 4 Preset Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(PRESETS).map(([code, p]) => {
                    const isSelected = selectedPresetCode === code;
                    const b = getClassBadge(p.condition_code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleSelectPreset(code)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900 border-teal-500 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold mb-1 ${b.bg}`}>
                              {code} — {p.case_name}
                            </span>
                            <div className="text-xs font-bold text-white leading-tight">{p.doctor_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.hospital}</div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-teal-300">HR: {p.heart_rate} bpm</span>
                          <span className="text-slate-400">BP: {p.blood_pressure}</span>
                          <span className="text-cyan-400">QRS: {p.qrs_duration_ms}ms</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Prescription Slip Zone */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Patient Prescription / ECG Report Slip</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">PDF, JPG, PNG, Scan</span>
                </div>

                <div className="p-5 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-teal-500/70 bg-slate-950/60 text-center transition group relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-white">
                      {prescriptionFile ? prescriptionFile.name : 'Drop doctor prescription or ECG slip here, or click to browse'}
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      Supports hospital consultation slips, prescription photos, 12-lead ECG traces, or lab reports.
                    </p>
                  </div>
                </div>

                {isUploadingFile && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Extracting clinical vitals & medication entries from uploaded document...</span>
                  </div>
                )}
              </div>

              {/* Clinical Vitals & Parameters Section */}
              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    <span>3. Clinical Vitals & Waveform Parameters (Extracted)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Cardiovascular Metrics</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Heart Rate (BPM) *
                    </label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 78"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Blood Pressure (mmHg)
                    </label>
                    <input
                      type="text"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="e.g. 120/80 mmHg"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      PR Interval (ms)
                    </label>
                    <input
                      type="number"
                      value={prInterval}
                      onChange={(e) => setPrInterval(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 160"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      QRS Duration (ms) *
                    </label>
                    <input
                      type="number"
                      value={qrsDuration}
                      onChange={(e) => setQrsDuration(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 90"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      QT Interval (ms)
                    </label>
                    <input
                      type="number"
                      value={qtInterval}
                      onChange={(e) => setQtInterval(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 400"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      ST Segment
                    </label>
                    <select
                      value={stSegment}
                      onChange={(e) => setStSegment(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    >
                      <option value="Normal / Isoelectric">Normal / Isoelectric</option>
                      <option value="Non-specific ST depression (<1mm)">Non-specific ST depression</option>
                      <option value="ST depression with T-wave inversion (Strain Pattern)">ST depression & T-wave inversion</option>
                      <option value="ST elevation (Ischemia alert)">ST elevation (Acute)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Prescribed Medications */}
              <div className="pt-2">
                <label className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Pill className="w-4 h-4" />
                  <span>Prescribed Medications & Dosages</span>
                </label>
                <input
                  type="text"
                  value={prescribedMeds}
                  onChange={(e) => setPrescribedMeds(e.target.value)}
                  placeholder="e.g., Metoprolol Succinate 25mg PO Daily, Apixaban 5mg BID"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>

              {/* Patient Symptoms Tags */}
              <div className="pt-2">
                <label className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Patient Symptoms & Clinical Presentations</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.some((s) => s.toLowerCase().includes(sym.toLowerCase().slice(0, 5)));
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => handleToggleSymptom(sym)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                            : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>}
                        <span>{sym}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attending Physician & Hospital Details */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Attending Physician
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g., Dr. Sarah Chen, MD"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Hospital / Clinical Institution
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g., Metropolitan Heart & Vascular Institute"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Doctor's Impressions / Notes */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Doctor's Clinical Impressions / Prescription Notes
                </label>
                <textarea
                  rows={2}
                  value={clinicalImpressions}
                  onChange={(e) => setClinicalImpressions(e.target.value)}
                  placeholder="Doctor's notes, rhythm interpretation, or recommendations..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>

              {/* Primary Analyze Prescription CTA Button */}
              <button
                type="button"
                onClick={handleAnalyzePrescription}
                disabled={isPredicting || !patientId}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition ${
                  isPredicting || !patientId
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-teal-500/20 active:scale-[0.99]'
                }`}
              >
                {isPredicting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                    <span>Analyzing Prescription & Running Extra Trees Inference...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analyze Prescription & Diagnose Cardiac Condition</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* WORKFLOW 2: BIOMEDICAL TELEMETRY & 54-FEATURE CSV (RESEARCH MODE) */}
          {activeWorkflow === 'telemetry' && (
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              
              {/* Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    <Sliders className="w-4 h-4" />
                    <span>Biomedical Signal Telemetry (54 Features)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Import research CSV data or load individual ground-truth validation rows.
                  </p>
                </div>

                {/* Import CSV Button */}
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={isUploadingCSV}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={isUploadingCSV}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-300 font-mono text-xs flex items-center gap-2 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingCSV ? 'Parsing CSV...' : 'Import 54-Feature CSV'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block uppercase">
                  Load Verified Research Vector:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadSample('NSR')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold transition text-left"
                  >
                    Normal (NSR)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('ARR')}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-bold transition text-left"
                  >
                    Arrhythmia (ARR)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('AFF')}
                    className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 text-xs font-mono font-bold transition text-left"
                  >
                    AFib (AFF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('CHF')}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-mono font-bold transition text-left"
                  >
                    Heart Failure (CHF)
                  </button>
                </div>
              </div>

              {/* Collapsible 54 Feature Parameters */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
                  className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/60 border border-slate-800 transition"
                >
                  <span>{showTelemetryDetails ? 'Hide' : 'View'} 54 Numerical Feature Parameters</span>
                  {showTelemetryDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTelemetryDetails && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    {Array.from({ length: 54 }, (_, i) => i + 1).map((idx) => {
                      const key = `feature_${idx}`;
                      return (
                        <div key={key}>
                          <label className="block text-[9px] font-mono text-slate-500 uppercase truncate">
                            {idx === 1 ? 'HR (F1)' : `F${idx}`}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={featureInputs[key] || ''}
                            onChange={(e) =>
                              setFeatureInputs((prev) => ({
                                ...prev,
                                [key]: e.target.value
                              }))
                            }
                            placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Telemetry Prediction Button */}
              <button
                type="button"
                onClick={handleSubmitTelemetryPrediction}
                disabled={isPredicting || !patientId}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs tracking-wide shadow-xl flex items-center justify-center gap-2 transition ${
                  isPredicting || !patientId
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-500/20 active:scale-[0.99]'
                }`}
              >
                {isPredicting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                    <span>Running Extra Trees Inference...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Run Extra Trees Inference on 54 Parameters</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Prediction Results & Clinical Diagnosis (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {predictionResult ? (
            <div className="space-y-6">
              
              {/* Primary Prediction Diagnostic Card */}
              {(() => {
                const badge = getClassBadge(predictionResult.predicted_class);
                return (
                  <div className={`p-6 rounded-3xl border shadow-2xl relative overflow-hidden ${badge.bg}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20 text-xs font-mono font-bold text-white mb-2">
                          <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`}></span>
                          DIAGNOSED: {predictionResult.predicted_class}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {predictionResult.condition_name}
                        </h2>
                        <p className="text-xs text-white/90 mt-1 font-mono">
                          Confidence: {(predictionResult.confidence_score * 100).toFixed(1)}% • {badge.urgency}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-white/70 block uppercase">Timestamp</span>
                        <span className="text-xs font-mono text-white/90">
                          {new Date(predictionResult.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Prescription Analysis Breakdown Card (If generated from prescription) */}
                    {predictionResult.prescription_analysis && (
                      <div className="mt-5 pt-4 border-t border-white/20 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-white">
                          <span className="flex items-center gap-1.5">
                            <FileCheck2 className="w-3.5 h-3.5 text-teal-300" />
                            Prescription Review Summary
                          </span>
                          <span className="text-[11px] text-white/80">
                            {predictionResult.prescription_analysis.doctor_name}
                          </span>
                        </div>

                        {/* Extracted Vitals Pill Grid */}
                        <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                          <div className="p-2 rounded-xl bg-black/30 border border-white/10">
                            <span className="text-white/60 block text-[9px]">HEART RATE</span>
                            <span className="font-bold text-white">
                              {predictionResult.prescription_analysis.extracted_vitals?.heart_rate || 'N/A'} bpm
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-black/30 border border-white/10">
                            <span className="text-white/60 block text-[9px]">BLOOD PRESSURE</span>
                            <span className="font-bold text-white">
                              {predictionResult.prescription_analysis.extracted_vitals?.blood_pressure || 'N/A'}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-black/30 border border-white/10">
                            <span className="text-white/60 block text-[9px]">QRS DURATION</span>
                            <span className="font-bold text-white">
                              {predictionResult.prescription_analysis.extracted_vitals?.qrs_duration_ms || 'N/A'} ms
                            </span>
                          </div>
                        </div>

                        {/* Waveform Abnormalities */}
                        {predictionResult.prescription_analysis.waveform_findings &&
                          predictionResult.prescription_analysis.waveform_findings.length > 0 && (
                            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                              <span className="text-[10px] font-mono text-white/70 uppercase block font-bold">
                                Detected Waveform Findings:
                              </span>
                              <ul className="text-xs text-white/90 space-y-0.5">
                                {predictionResult.prescription_analysis.waveform_findings.map((f: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 shrink-0 mt-1.5"></span>
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Medication Safety Advisories */}
                        {predictionResult.prescription_analysis.medication_evaluation &&
                          predictionResult.prescription_analysis.medication_evaluation.length > 0 && (
                            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                              <span className="text-[10px] font-mono text-white/70 uppercase block font-bold flex items-center gap-1.5">
                                <Pill className="w-3 h-3 text-cyan-300" />
                                Medication Safety Check:
                              </span>
                              <ul className="text-xs text-white/90 space-y-0.5">
                                {predictionResult.prescription_analysis.medication_evaluation.map((m: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0 mt-1.5"></span>
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Multiclass Probabilities Breakdown */}
                    <div className="mt-5 pt-4 border-t border-white/20 space-y-3">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-white/90 font-bold flex items-center justify-between">
                        <span>Class Probabilities</span>
                        <BarChart3 className="w-3.5 h-3.5 text-white/70" />
                      </h3>

                      <div className="space-y-2">
                        {(['ARR', 'AFF', 'CHF', 'NSR'] as ECGClassCode[]).map((cls) => {
                          const prob = predictionResult.probabilities[cls] || 0;
                          const pct = (prob * 100).toFixed(1);
                          const isSelected = cls === predictionResult.predicted_class;
                          const bInfo = getClassBadge(cls);

                          return (
                            <div key={cls} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-mono ${isSelected ? 'font-black text-white' : 'text-white/70'}`}>
                                  {cls} ({bInfo.label})
                                </span>
                                <span className="font-mono text-xs font-bold text-white">{pct}%</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${bInfo.bar}`}
                                  style={{ width: `${Math.max(Number(pct), 2)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons: PDF Download & Book Consultation */}
                    <div className="mt-5 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2 uppercase tracking-wider"
                      >
                        {isGeneratingReport ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                            <span>Generating ReportLab PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Formal PDF Report</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onNavigate?.('appointments')}
                        className="w-full py-2.5 px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/30 text-white font-bold text-xs transition flex items-center justify-center gap-2 uppercase tracking-wider"
                      >
                        <Calendar className="w-3.5 h-3.5 text-teal-300" />
                        <span>Book Cardiologist</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Clinical Pathology Context Card */}
              {predictionResult.clinical_summary && (
                <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-teal-300 font-bold uppercase tracking-wider">
                    <Stethoscope className="w-4 h-4 text-teal-400" />
                    <span>Clinical Context & Diagnostic Criteria</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {predictionResult.clinical_summary.description}
                  </p>

                  {/* Typical Symptoms */}
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1.5">
                      Associated Clinical Symptoms:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {predictionResult.clinical_summary.typical_symptoms.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-1.5"></span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Investigations */}
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1.5">
                      Recommended Investigations:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {predictionResult.clinical_summary.possible_clinical_tests.map((t, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Physician Follow-up */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-[11px] text-slate-300">
                    <strong className="text-teal-300">Physician Follow-up: </strong>
                    {predictionResult.clinical_summary.clinical_followup}
                  </div>

                  {/* Emergency Warning */}
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Emergency Protocol (Dial 112 / 911): </strong>
                      {predictionResult.clinical_summary.emergency_warning}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State: Explains Prescription Analyzer */
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
                <Heart className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Active ECG Prediction</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Select a registered patient and click any clinical hospital preset, upload a doctor's prescription slip, or run the Extra Trees pipeline.
                </p>
              </div>

              {/* Supported Classes Reference Card */}
              <div className="pt-4 border-t border-slate-800 text-left space-y-2.5 text-xs">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">
                  Diagnostic Disease Class Reference:
                </span>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-emerald-400 font-bold">NSR</span>
                    </div>
                    <span className="text-slate-300">Normal Sinus Rhythm</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="text-amber-400 font-bold">ARR</span>
                    </div>
                    <span className="text-slate-300">Cardiac Arrhythmia</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span className="text-purple-400 font-bold">AFF</span>
                    </div>
                    <span className="text-slate-300">Atrial Fibrillation</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span className="text-rose-400 font-bold">CHF</span>
                    </div>
                    <span className="text-slate-300">Congestive Heart Failure</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Safety Notice */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-[11px] leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-200">Clinical Safety Notice</p>
              <p>
                CardioPulse AI is an analytical clinical decision-support and educational tool, NOT a definitive diagnostic instrument.
                Machine learning classifications must always be interpreted in conjunction with standard clinical 12-lead ECGs,
                laboratory biomarkers, and a licensed physician's evaluation.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
