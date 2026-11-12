const API_BASE = '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('cardiopulse_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Request failed: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.detail || errorMsg;
      } catch (e) {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: { email: string; password: string; full_name: string; role: string }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Patient Profile
  async getPatientProfile() {
    return this.request<any>('/patients/profile');
  }

  async updatePatientProfile(data: any) {
    return this.request<any>('/patients/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateMedicalHistory(data: any) {
    return this.request<any>('/patients/medical-history', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addMedication(data: any) {
    return this.request<any>('/patients/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMedication(id: number) {
    return this.request<any>(`/patients/medications/${id}`, {
      method: 'DELETE',
    });
  }

  async addAllergy(data: any) {
    return this.request<any>('/patients/allergies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAllergy(id: number) {
    return this.request<any>(`/patients/allergies/${id}`, {
      method: 'DELETE',
    });
  }

  // Readings
  async createReading(data: any) {
    return this.request<any>('/readings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReadings(limit: number = 50) {
    return this.request<any[]>(`/readings?limit=${limit}`);
  }

  async getMetricsSummary(days: number = 7) {
    return this.request<any>(`/readings/metrics/summary?days=${days}`);
  }

  // AI Analysis
  async evaluateReading(readingId: number) {
    return this.request<any>(`/analysis/evaluate/${readingId}`, {
      method: 'POST',
    });
  }

  async getLatestAnalysis() {
    return this.request<any>('/analysis/latest');
  }

  // Reports
  async generateReport() {
    return this.request<any>('/reports/generate', {
      method: 'POST',
    });
  }

  async getReports() {
    return this.request<any[]>('/reports');
  }

  async getReportById(id: number) {
    return this.request<any>(`/reports/${id}`);
  }

  getPdfDownloadUrl(reportId: number): string {
    return `${API_BASE}/reports/${reportId}/download-pdf`;
  }

  // Doctor Portal
  async getDoctorPatients(query?: string) {
    const q = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.request<any[]>(`/doctor/patients${q}`);
  }

  async getDoctorPatientDossier(patientId: number) {
    return this.request<any>(`/doctor/patients/${patientId}`);
  }

  async reviewDoctorReport(reportId: number, data: { clinician_notes: string; recommended_followup?: string; approved: boolean }) {
    return this.request<any>(`/doctor/reports/${reportId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Chat
  async sendChatMessage(message: string, history: any[] = []) {
    return this.request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: history }),
    });
  }

  // Privacy & Consent
  async getConsent() {
    return this.request<any>('/privacy/consent');
  }

  async updateConsent(data: any) {
    return this.request<any>('/privacy/consent', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAuditLogs(limit: number = 50) {
    return this.request<any[]>(`/privacy/audit-logs?limit=${limit}`);
  }

  async requestDataDeletion() {
    return this.request<any>('/privacy/delete-my-data', {
      method: 'POST',
    });
  }

  // Appointments
  async getAvailableDoctors() {
    return this.request<any[]>('/appointments/doctors');
  }

  async getAppointments(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/appointments${query}`);
  }

  async createAppointment(data: { doctor_id: number; appointment_date: string; appointment_type?: string; reason: string; clinical_notes?: string }) {
    return this.request<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(id: number, data: { status?: string; clinical_notes?: string; appointment_date?: string }) {
    return this.request<any>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Messaging
  async getMessages(otherUserId?: number) {
    const query = otherUserId ? `?other_user_id=${otherUserId}` : '';
    return this.request<any[]>(`/messages${query}`);
  }

  // Wearables & Devices
  async getDevices() {
    return this.request<any[]>('/devices');
  }

  async registerDevice(data: { device_name: string; device_type: string; serial_number: string; mac_address?: string; firmware_version?: string }) {
    return this.request<any>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncDeviceReading(deviceId: number, bpm?: number, restingStatus: string = 'resting') {
    const query = bpm ? `?bpm=${bpm}&resting_status=${restingStatus}` : `?resting_status=${restingStatus}`;
    return this.request<any>(`/devices/${deviceId}/sync${query}`, {
      method: 'POST',
    });
  }

  async toggleDeviceConnection(deviceId: number) {
    return this.request<any>(`/devices/${deviceId}/toggle-connection`, {
      method: 'PATCH',
    });
  }

  async removeDevice(deviceId: number) {
    return this.request<any>(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Education Center
  async getEducationModules() {
    return this.request<any[]>('/education/modules');
  }

  async getEducationModuleBySlug(slug: string) {
    return this.request<any>(`/education/modules/${slug}`);
  }

  async submitModuleQuiz(moduleId: number, answers: Record<string, string>) {
    return this.request<any>(`/education/modules/${moduleId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  // Cardiovascular Analytics
  async getCardiovascularAnalytics() {
    return this.request<any>('/analytics/overview');
  }

  // Admin Management
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async updateAdminUser(userId: number, data: { is_active?: boolean; role?: string }) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async verifyDoctorLicense(doctorId: number, verified: boolean = true) {
    return this.request<any>(`/admin/doctors/${doctorId}/verify?verified=${verified}`, {
      method: 'POST',
    });
  }

  async getGlobalAuditLogs(limit: number = 100) {
    return this.request<any[]>(`/admin/audit-logs?limit=${limit}`);
  }

  async getAdminDashboard() {
    return this.request<any>('/admin/dashboard');
  }

  async getSystemHealth() {
    return this.request<any>('/admin/system-health');
  }

  // ============================================================================
  // ECG Machine Learning Prediction APIs
  // ============================================================================

  async createECGPrediction(payload: {
    patient_id: number;
    feature_values: Record<string, number>;
    notes?: string;
  }) {
    return this.request<any>('/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getECGPredictions(patientId?: number) {
    const url = patientId ? `/predictions?patient_id=${patientId}` : '/predictions';
    return this.request<any[]>(url);
  }

  async getECGPredictionById(id: number) {
    return this.request<any>(`/predictions/${id}`);
  }

  async getModelInfo() {
    return this.request<any>('/predictions/model-info');
  }

  async getSampleFeatures(conditionCode: string) {
    return this.request<{ condition_code: string; n_features: number; features: Record<string, number> }>(
      `/predictions/sample-features/${conditionCode}`
    );
  }

  async parseECGCSV(file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/predictions/parse-csv`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = `Upload failed: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.detail || errorMsg;
      } catch (e) {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  async getPrescriptionPresets() {
    return this.request<Record<string, any>>('/predictions/presets');
  }

  async analyzePrescription(payload: {
    patient_id: number;
    prescription_text?: string;
    heart_rate?: number;
    blood_pressure?: string;
    pr_interval_ms?: number;
    qrs_duration_ms?: number;
    qt_interval_ms?: number;
    st_segment?: string;
    symptoms?: string[];
    prescribed_medications?: string;
    clinical_notes?: string;
    condition_preset?: string;
    manual_features?: Record<string, number>;
  }) {
    return this.request<any>('/predictions/analyze-prescription', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async uploadPrescriptionFile(file: File, patientId: number, clinicalNotes?: string) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', String(patientId));
    if (clinicalNotes) {
      formData.append('clinical_notes', clinicalNotes);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/predictions/upload-prescription`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = `Upload failed: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.detail || errorMsg;
      } catch (e) {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // ============================================================================
  // Patient CRUD APIs
  // ============================================================================

  async getAllPatients(search?: string) {
    const url = search ? `/patients?search=${encodeURIComponent(search)}` : '/patients';
    return this.request<any[]>(url);
  }

  async getPatientById(id: number) {
    return this.request<any>(`/patients/${id}`);
  }

  async createPatient(data: any) {
    return this.request<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePatient(id: number, data: any) {
    return this.request<any>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePatient(id: number) {
    return this.request<any>(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // ECG Prediction Report Generation & Download APIs
  // ============================================================================

  async generateReportFromPrediction(predictionId: number) {
    return this.request<any>(`/reports/from-prediction/${predictionId}`, {
      method: 'POST',
    });
  }

  getReportPdfUrl(reportId: number): string {
    return `${API_BASE}/reports/${reportId}/pdf`;
  }

  // ============================================================================
  // Auth Password Reset APIs
  // ============================================================================

  async forgotPassword(email: string) {
    return this.request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { email: string; reset_token: string; new_password: string }) {
    return this.request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Upgraded Role-Based Auth, Directory, Appointments & Prescriptions
  // ============================================================================

  async registerDoctor(data: any) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ role: 'doctor', doctor: data }),
    });
  }

  async registerPatient(data: any) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ role: 'patient', patient: data }),
    });
  }

  async getApprovedDoctors(specialty?: string, query?: string) {
    const params = new URLSearchParams();
    if (specialty) params.append('specialty', specialty);
    if (query) params.append('query', query);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/doctors${qs}`);
  }

  async getDoctorProfile(id: number) {
    return this.request<any>(`/doctors/${id}`);
  }

  async getOwnDoctorProfile() {
    return this.request<any>('/doctor/profile');
  }

  async updateOwnDoctorProfile(data: any) {
    return this.request<any>('/doctor/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Appointments
  async requestAppointment(data: { doctor_id: number; appointment_date: string; appointment_type?: string; reason?: string }) {
    return this.request<any>('/appointments/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyAppointments() {
    return this.request<any>('/appointments/my');
  }

  async getDoctorAppointments() {
    return this.request<any>('/appointments/doctor');
  }

  async updateAppointmentStatus(id: number, status: string, clinical_notes?: string) {
    return this.request<any>(`/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, clinical_notes }),
    });
  }

  async cancelAppointment(id: number) {
    return this.request<any>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  // Messages & Consultations
  async sendMessage(
    recipientOrData: number | { recipient_id: number; content: string; is_urgent?: boolean; patient_id?: number },
    content?: string,
    subject?: string
  ) {
    if (typeof recipientOrData === 'object') {
      return this.request<any>('/messages', {
        method: 'POST',
        body: JSON.stringify(recipientOrData),
      });
    }
    return this.request<any>('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientOrData, content, subject }),
    });
  }

  async getMessageThread(otherUserId: number) {
    return this.request<any>(`/messages/thread/${otherUserId}`);
  }

  async getInbox() {
    return this.request<any>('/messages/inbox');
  }

  async getUnreadMessageCount() {
    return this.request<{ unread_count: number }>('/messages/unread-count');
  }

  async markMessageRead(id: number) {
    return this.request<any>(`/messages/${id}/read`, {
      method: 'PUT',
    });
  }

  // Notifications
  async getNotifications(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/notifications${query}`);
  }

  async markNotificationRead(id: number) {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async getUnreadNotificationCount() {
    return this.request<{ unread_count: number }>('/notifications/unread-count');
  }

  async deleteNotification(id: number) {
    return this.request<any>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // Medical Uploads
  async uploadMedicalReport(formData: FormData) {
    return this.request<any>('/medical-uploads/', {
      method: 'POST',
      body: formData,
    });
  }

  async getMyUploads() {
    return this.request<any>('/medical-uploads/my');
  }

  async deleteMedicalUpload(id: number) {
    return this.request<any>(`/medical-uploads/${id}`, {
      method: 'DELETE',
    });
  }

  // Prescriptions
  async createPrescription(data: any) {
    return this.request<any>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyPrescriptions() {
    return this.request<any>('/prescriptions/my');
  }

  async getDoctorPrescriptions() {
    return this.request<any>('/prescriptions/doctor');
  }

  async getPrescription(id: number) {
    return this.request<any>(`/prescriptions/${id}`);
  }

  getPrescriptionPdfUrl(id: number): string {
    return `${API_BASE}/prescriptions/${id}/download`;
  }

  // Admin Management
  async getPendingDoctors() {
    return this.request<any>('/admin/doctors/pending');
  }

  async getAllDoctorsAdmin() {
    return this.request<any>('/admin/doctors');
  }

  async approveDoctor(id: number, action: string, reason?: string) {
    return this.request<any>(`/admin/doctors/${id}/approval`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
  }

  async getAllPatientsAdmin() {
    return this.request<any>('/admin/patients');
  }

  async getAdminAppointments(params?: { doctor_id?: number; patient_id?: number; status?: string }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<any>(`/admin/appointments${q ? `?${q}` : ''}`);
  }

  async toggleUserStatus(userId: number, isActive: boolean) {
    return this.request<any>(`/admin/users/${userId}/status?is_active=${isActive}`, {
      method: 'PUT',
    });
  }
}

export const api = new ApiService();

// Standalone exported convenience functions for components that import functions directly
export const registerDoctor = (data: any) => api.registerDoctor(data);
export const registerPatient = (data: any) => api.registerPatient(data);
export const getApprovedDoctors = (specialty?: string, query?: string) => api.getApprovedDoctors(specialty, query);
export const getDoctorProfileById = (id: number) => api.getDoctorProfile(id);
export const getOwnDoctorProfile = () => api.getOwnDoctorProfile();
export const updateOwnDoctorProfile = (data: any) => api.updateOwnDoctorProfile(data);
export const requestAppointment = (data: any) => api.requestAppointment(data);
export const getMyAppointments = () => api.getMyAppointments();
export const getDoctorAppointments = () => api.getDoctorAppointments();
export const updateAppointmentStatus = (id: number, status: string, notes?: string) => api.updateAppointmentStatus(id, status, notes);
export const cancelAppointment = (id: number) => api.cancelAppointment(id);
export const sendMessage = (recipient_id: number, content: string, subject?: string) => api.sendMessage(recipient_id, content, subject);
export const getMessageThread = (otherUserId: number) => api.getMessageThread(otherUserId);
export const getInbox = () => api.getInbox();
export const getUnreadMessageCount = () => api.getUnreadMessageCount();
export const getNotifications = () => api.getNotifications();
export const markNotificationRead = (id: number) => api.markNotificationRead(id);
export const markAllNotificationsRead = () => api.markAllNotificationsRead();
export const getUnreadNotificationCount = () => api.getUnreadNotificationCount();
export const deleteNotification = (id: number) => api.deleteNotification(id);
export const uploadMedicalReport = (formData: FormData) => api.uploadMedicalReport(formData);
export const getMyUploads = () => api.getMyUploads();
export const deleteMedicalUpload = (id: number) => api.deleteMedicalUpload(id);
export const createPrescription = (data: any) => api.createPrescription(data);
export const getMyPrescriptions = () => api.getMyPrescriptions();
export const getDoctorPrescriptions = () => api.getDoctorPrescriptions();
export const getPrescriptionById = (id: number) => api.getPrescription(id);
export const getPendingDoctors = () => api.getPendingDoctors();
export const getAllDoctorsAdmin = () => api.getAllDoctorsAdmin();
export const approveDoctor = (id: number, action: string, reason?: string) => api.approveDoctor(id, action, reason);
export const getAllPatientsAdmin = () => api.getAllPatientsAdmin();
export const getAdminStats = () => api.getAdminStats();

