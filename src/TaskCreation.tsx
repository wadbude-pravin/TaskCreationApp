import React, { useState, useEffect } from 'react';
import './TaskCreation.css';

interface RequestItem {
  id: string;
  title: string;
}

const TaskCreation: React.FC = () => {
  const [taskForm, setTaskForm] = useState({ category: '', title: '', description: '', priority: '' });
  const [taskErrors, setTaskErrors] = useState({ category: '', title: '', description: '', priority: '' });
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  /** Extract the guest session token from the URL path (e.g. /s/:token). */
  const getTokenFromPath = (): string => {
    const pathSegments = window.location.pathname.split('/');
    return pathSegments[pathSegments.length - 1] || '';
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = getTokenFromPath();

        if (!token || token === 's') {
          setRoomNumber('--');
          return;
        }

        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${baseUrl}/s/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (response.ok) {
          const data = await response.json();

          // The GET /s/:token response returns:
          // { room: { roomNumber, roomName }, symptoms: [...] }
          // propertyId/roomId/bookingId are resolved server-side from
          // the token — they are never sent to the guest.
          const fetchedRoomNumber =
            data?.room?.roomNumber ||
            data?.session?.roomNumber ||
            data?.roomNumber ||
            '';
          setRoomNumber(fetchedRoomNumber);
          setSessionLoaded(true);
        } else {
          setRoomNumber('--');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setRoomNumber('--');
      }
    };

    fetchSession();
  }, []);

  const categories = [
    { label: 'Housekeeping', value: 'HOUSEKEEPING' },
    { label: 'Guest Service', value: 'GUEST_SERVICE' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
  ];

  const priorities = ['LOW', 'NORMAL', 'HIGH'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs = { category: '', title: '', description: '', priority: '' };
    if (!taskForm.category) errs.category = 'Category is required';
    if (!taskForm.title?.trim()) errs.title = 'Title is required';
    if (!taskForm.description?.trim()) errs.description = 'Description is required';
    if (!taskForm.priority) errs.priority = 'Priority is required';

    if (errs.category || errs.title || errs.description || errs.priority) {
      setTaskErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const token = getTokenFromPath();

    if (!sessionLoaded || !token) {
      console.error('Session not loaded or token missing. sessionLoaded:', sessionLoaded, 'token:', token);
      setErrorMessage("Session details could not be loaded. Please refresh the link.");
      setIsSubmitting(false);
      return;
    }

    // The backend resolves propertyId, roomId, bookingId, and guestId
    // server-side from the guestSessionToken. The guest never needs to
    // know or send those values.
    const payload = {
      category: taskForm.category,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      guestSessionToken: token,
    };

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJhZTY4MWM0ZC0wNTg1LTQ4NjItYWZkNS03MTJiYmU5OTAzODYiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3ODYyNzE0NDJ9.5OWCNVhVkBBcUVzGf1vrABDGb5GzpbpCo3MKPwesAzA`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Task creation failed:', response.status, errorData);
        throw new Error(errorData?.error || 'Failed to create task');
      }

      const data = await response.json();

      const displayId = data.task?.id ? `#${data.task.id.split('-')[0].toUpperCase()}` : `#P${Math.floor(Math.random() * 4095).toString(16).toUpperCase()}FF`;

      const newRequest: RequestItem = {
        id: displayId,
        title: data.task?.title || taskForm.title,
      };

      setRequests([newRequest, ...requests]);
      setTaskForm({ category: '', title: '', description: '', priority: '' });
      setTaskErrors({ category: '', title: '', description: '', priority: '' });

    } catch (error) {
      console.error("API Error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to send request. Please check if the backend is running and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Room {roomNumber || 'Loading...'}</h1>
      </header>

      <main className="main-content">
        <div className="card request-card">
          <div className="modal-header">
            <h2>Create Task</h2>
            <p className="subtitle">Add a task for this room</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>CATEGORY</label>
              <div className="category-grid">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`category-btn ${taskForm.category === c.value ? 'selected' : ''}`}
                    onClick={() => {
                      setTaskForm((p) => ({ ...p, category: c.value }));
                      setTaskErrors((p) => ({ ...p, category: '' }));
                    }}
                    disabled={isSubmitting}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {taskErrors.category && <span className="error-text">{taskErrors.category}</span>}
            </div>

            <div className="form-group">
              <label>TITLE</label>
              <input
                type="text"
                placeholder="Short title"
                value={taskForm.title}
                onChange={(e) => {
                  setTaskForm((p) => ({ ...p, title: e.target.value }));
                  setTaskErrors((p) => ({ ...p, title: '' }));
                }}
                className={`text-input ${taskErrors.title ? 'error-border' : ''}`}
                disabled={isSubmitting}
              />
              {taskErrors.title && <span className="error-text">{taskErrors.title}</span>}
            </div>

            <div className="form-group">
              <label>DESCRIPTION</label>
              <textarea
                placeholder="Describe the task"
                value={taskForm.description}
                onChange={(e) => {
                  setTaskForm((p) => ({ ...p, description: e.target.value }));
                  setTaskErrors((p) => ({ ...p, description: '' }));
                }}
                className={`text-input multiline ${taskErrors.description ? 'error-border' : ''}`}
                disabled={isSubmitting}
              />
              {taskErrors.description && <span className="error-text">{taskErrors.description}</span>}
            </div>

            <div className="form-group">
              <label>PRIORITY</label>
              <div className="priority-grid">
                {priorities.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`priority-btn ${taskForm.priority === p ? 'selected' : ''}`}
                    onClick={() => {
                      setTaskForm((s) => ({ ...s, priority: p }));
                      setTaskErrors((s) => ({ ...s, priority: '' }));
                    }}
                    disabled={isSubmitting}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {taskErrors.priority && <span className="error-text">{taskErrors.priority}</span>}
            </div>

            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT TASK'}
            </button>
          </form>
        </div>

        {requests.length > 0 && (
          <div className="card requests-list-card">
            <h2>Your requests</h2>
            <div className="requests-container">
              {requests.map((req, index) => (
                <div key={index} className="request-item">
                  <div className="request-info">
                    <span className="request-title">{req.title}</span>
                    <span className="request-id">{req.id}</span>
                  </div>
                  <span className="badge-new">NEW</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TaskCreation;
