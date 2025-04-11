import React, { useState } from 'react';
import axios from 'axios';
import { fetchAuthSession } from '@aws-amplify/auth';
import { Form, Button, Card, Alert } from 'react-bootstrap';

function AddTask() {
    const [taskData, setTaskData] = useState({
        description: "",
        dueDate: "",      // New field: Due Date (expecting a date)
        priority: "",     // New field: Priority (e.g., "Low", "Normal", "High")
        category: "",     // New field: Category (e.g., "Work", "Personal")
    });
    const [message, setMessage] = useState("");
    const API_BASE = 'https://dl5xikhk88.execute-api.ca-central-1.amazonaws.com/production';

    async function getAuthToken() {
        try {
            const session = await fetchAuthSession();
            console.log("Auth session:", session);

            if (session.getIdToken && typeof session.getIdToken === 'function') {
                const idToken = session.getIdToken().getJwtToken();
                if (idToken) {
                    return idToken;
                }
            }

            if (session.tokens && session.tokens.idToken) {
                if (session.tokens.idToken.jwtToken) {
                    return session.tokens.idToken.jwtToken;
                }

                if (typeof session.tokens.idToken.toString === 'function') {
                    const tokenString = session.tokens.idToken.toString();
                    if (tokenString && tokenString.length > 0) {
                        return tokenString;
                    }
                }
            }

            console.warn("No token found in auth session:", session);
            return null;
        } catch (error) {
            console.error("Error fetching auth session:", error);
            return null;
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!taskData.description.trim()) {
            setMessage("Description is required.");
            return;
        }
        const token = await getAuthToken();
        if (!token) {
            setMessage("Unable to fetch auth token.");
            return;
        }
        try {
            const response = await axios.post(`${API_BASE}/tasks`, taskData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(response.data.message || "Task added successfully!");
            // Optionally clear the form after submission
            setTaskData({
                description: "",
                dueDate: "",
                priority: "",
                category: ""
            });
        } catch (error) {
            console.error("Error adding task:", error);
            setMessage("Error adding task.");
        }
    };

    return (
        <Card className="p-3">
            <Card.Title>Add a New Task</Card.Title>
            {message && <Alert variant="info">{message}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formDescription">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter task description"
                        name="description"
                        value={taskData.description}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>
                <Form.Group controlId="formDueDate" className="mt-2">
                    <Form.Label>Due Date</Form.Label>
                    <Form.Control
                        type="date"
                        name="dueDate"
                        value={taskData.dueDate}
                        onChange={handleChange}
                    />
                </Form.Group>
                <Form.Group controlId="formPriority" className="mt-2">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select
                        name="priority"
                        value={taskData.priority}
                        onChange={handleChange}
                    >
                        <option value="">Select Priority</option>
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group controlId="formCategory" className="mt-2">
                    <Form.Label>Category</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter category (e.g., Work, Personal)"
                        name="category"
                        value={taskData.category}
                        onChange={handleChange}
                    />
                </Form.Group>
                <Button variant="primary" type="submit" className="mt-3">
                    Add Task
                </Button>
            </Form>
        </Card>
    );
}

export default AddTask;
