function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isLocalFrontend =
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      (port === '5173' || port === '4173');

    if (isLocalFrontend) {
      return `${protocol}//127.0.0.1:8000`;
    }
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();
let authToken = null;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function setAuthToken(token) {
  authToken = token || null;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...JSON_HEADERS,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(`Unable to reach the backend at ${API_BASE_URL || 'the current origin'}. Start the Python server and try again.`);
  }

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const payload = await response.json();
      message = payload.detail || payload.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getDashboard() {
  return request('/api/dashboard');
}

export function signIn(payload) {
  return request('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function signUp(payload) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload) {
  return request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAuditLogs() {
  return request('/api/audit-logs');
}

export function createStudent(payload) {
  return request('/api/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStudent(studentId, payload) {
  return request(`/api/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function recordStudentPayment(studentId, payload) {
  return request(`/api/students/${studentId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteStudent(studentId) {
  return request(`/api/students/${studentId}`, {
    method: 'DELETE',
  });
}

export function createTeacher(payload) {
  return request('/api/teachers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTeacher(teacherId, payload) {
  return request(`/api/teachers/${teacherId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteTeacher(teacherId) {
  return request(`/api/teachers/${teacherId}`, {
    method: 'DELETE',
  });
}

export function updateTeacherStudent(teacherId, studentId, payload) {
  return request(`/api/teachers/${teacherId}/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
