// src/components/Home.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, signOut, fetchAuthSession } from '@aws-amplify/auth';
import { Alert, Table, Card, Button, Modal, Form } from 'react-bootstrap';

function Home() {
    const [tasks, setTasks] = useState([]);
    const [email, setEmail] = useState('');
    const [authToken, setAuthToken] = useState(null);

    // For update functionality
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [updateData, setUpdateData] = useState({
        description: '',
        dueDate: '',
        priority: '',
        category: '',
        completed: false,
    });

    const [updateAlert, setUpdateAlert] = useState('');

    // Change API_BASE as needed. Replace with your production endpoint.
    const API_BASE = 'https://dl5xikhk88.execute-api.ca-central-1.amazonaws.com/production';

    // Retrieve auth token using fetchAuthSession
    async function getAuthToken() {
        try {
            const session = await fetchAuthSession();
            console.log("Auth session:", session);
            if (session.getIdToken && typeof session.getIdToken === 'function') {
                const idToken = session.getIdToken().getJwtToken();
                if (idToken) return idToken;
            }
            if (session.tokens && session.tokens.idToken) {
                if (session.tokens.idToken.jwtToken) return session.tokens.idToken.jwtToken;
                if (typeof session.tokens.idToken.toString === 'function') {
                    const tokenString = session.tokens.idToken.toString();
                    if (tokenString && tokenString.length > 0) return tokenString;
                }
            }
            console.warn("No token found in auth session:", session);
            return null;
        } catch (error) {
            console.error("Error fetching auth session:", error);
            return null;
        }
    }

    // Retrieve the email from the current authenticated user
    async function getEmail() {
        try {
            const user = await getCurrentUser();
            // Check for email in user.attributes; fallback to signInDetails.loginId
            if (user.attributes && user.attributes.email) {
                return user.attributes.email;
            }
            if (user.signInDetails && user.signInDetails.loginId) {
                return user.signInDetails.loginId.split('@')[0];
            }
            return "Unknown";
        } catch (error) {
            console.error("Error retrieving current user:", error);
            return "Unknown";
        }
    }

    // Load tasks from API using the auth token
    const loadTasks = (token) => {
        axios.get(`${API_BASE}/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(response => setTasks(response.data))
            .catch(error => console.error("Error fetching tasks:", error));
    };

    // Initialization: fetch token and email, then load tasks.
    useEffect(() => {
        async function initialize() {
            const token = await getAuthToken();
            if (token) {
                setAuthToken(token);
                loadTasks(token);
            }
            const emailValue = await getEmail();
            setEmail(emailValue);
        }
        initialize();
    }, []);

    // Sign-out handler
    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.reload();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // Delete task handler
    const deleteTask = async (taskId) => {
        if (!authToken) {
            console.error("No auth token available.");
            return;
        }
        try {
            await axios.delete(`${API_BASE}/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setUpdateAlert("Task deleted successfully!");
            setTimeout(() => setUpdateAlert(''), 3000);
            setTasks(tasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error("Error deleting task:", error);
            setUpdateAlert("Error deleting task.");
            setTimeout(() => setUpdateAlert(''), 3000);
        }
    };

    // Open update modal with selected task details
    const handleUpdateClick = (task) => {
        setSelectedTask(task);
        setUpdateData({
            description: task.description || '',
            dueDate: task.dueDate || '',
            priority: task.priority || '',
            category: task.category || '',
            completed: task.completed || false,
        });
        setShowUpdateModal(true);
    };

    // Handle form field changes in the update modal
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUpdateData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Submit updated task data to backend
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!authToken || !selectedTask) {
            console.error("No auth token or selected task available.");
            return;
        }
        try {
            const response = await axios.put(
                `${API_BASE}/tasks/${selectedTask.id}`,
                updateData,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            loadTasks(authToken);
            setUpdateAlert(response.data.message || "Task updated successfully!");
            setTimeout(() => setUpdateAlert(''), 3000);
            const updatedTask = response.data;
            setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
            setShowUpdateModal(false);
            setSelectedTask(null);
        } catch (error) {
            setUpdateAlert("Error updating task.");
            setTimeout(() => setUpdateAlert(''), 3000);
            console.error("Error updating task:", error);
        }
    };

    // Close update modal
    const handleCloseModal = () => {
        setShowUpdateModal(false);
        setSelectedTask(null);
    };

    return (
        <div>
            <Card className="mb-3">
                <Card.Body className="d-flex justify-content-between align-items-center">
                    <Card.Title>Welcome, {email}!</Card.Title>
                    <Button variant="danger" onClick={handleSignOut}>Sign Out</Button>
                </Card.Body>
            </Card>

            {updateAlert && (
                <Alert variant="info" onClose={() => setUpdateAlert('')} dismissible>
                    {updateAlert}
                </Alert>
            )}

            <Card className="mb-3">
                <Card.Header>Your Tasks</Card.Header>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Due Date</th>
                            <th>Priority</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center">
                                    No tasks available.
                                </td>
                            </tr>
                        ) : (
                            tasks.map(task => (
                                <tr key={task.id}>
                                    <td>{task.description}</td>
                                    <td>{task.dueDate || 'N/A'}</td>
                                    <td>{task.priority || 'N/A'}</td>
                                    <td>{task.category || 'N/A'}</td>
                                    <td>{task.completed ? "Done" : "Pending"}</td>
                                    <td>
                                        <Button
                                            variant="warning"
                                            size="sm"
                                            onClick={() => handleUpdateClick(task)}
                                            className="me-1"
                                        >
                                            Update
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => deleteTask(task.id)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Modal for updating task */}
            <Modal show={showUpdateModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Update Task</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdateSubmit}>
                    <Modal.Body>
                        <Form.Group controlId="updateDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                type="text"
                                name="description"
                                value={updateData.description}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group controlId="updateDueDate" className="mt-2">
                            <Form.Label>Due Date</Form.Label>
                            <Form.Control
                                type="date"
                                name="dueDate"
                                value={updateData.dueDate}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Form.Group controlId="updatePriority" className="mt-2">
                            <Form.Label>Priority</Form.Label>
                            <Form.Select
                                name="priority"
                                value={updateData.priority}
                                onChange={handleChange}
                            >
                                <option value="">Select Priority</option>
                                <option value="Low">Low</option>
                                <option value="Normal">Normal</option>
                                <option value="High">High</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group controlId="updateCategory" className="mt-2">
                            <Form.Label>Category</Form.Label>
                            <Form.Control
                                type="text"
                                name="category"
                                value={updateData.category}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Form.Group controlId="updateCompleted" className="mt-2">
                            <Form.Check
                                type="checkbox"
                                label="Completed"
                                name="completed"
                                checked={updateData.completed}
                                onChange={handleChange}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Update Task
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

export default Home;
