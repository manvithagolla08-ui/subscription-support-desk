# Subscription Product Support Desk

An AI-powered SaaS support portal that helps customers understand their subscriptions, find answers to product-related questions, and raise support tickets. The platform provides role-based access for customers, support specialists, knowledge managers, and supervisors.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [AI Integration](#ai-integration)
- [API and Backend](#api-and-backend)
- [Security](#security)
- [Testing](#testing)
- [Future Improvements](#future-improvements)
- [Contributors](#contributors)

## Overview

The Subscription Product Support Desk is a full-stack web application designed to simplify customer support for a fictional SaaS platform.

Customers can view their subscription information, explore available support resources, and create tickets when they need assistance. AI-powered support uses relevant help articles and verified application data to generate useful answers. Support specialists can manage tickets, while knowledge managers maintain the help documentation.

The project combines traditional support workflows with AI-powered information retrieval to make customer assistance more efficient and consistent.

**Note:** This project uses seeded or simulated subscription and service data. It does not integrate with a real payment or billing provider.

## Features

### Authentication and Authorization
- User registration and login.
- Token-based authentication.
- Role-based access control.
- Protected frontend routes and backend endpoints.

### Subscription Management
- View available subscription plans.
- Retrieve organization subscription information.
- Display plan features and entitlements.
- Manage organization and membership information according to permissions.

### AI-Powered Support
- Generate answers using a language model.
- Retrieve relevant help information for user questions.
- Use verified plan and entitlement information where available.
- Support natural-language questions about product features and account limits.

### Ticket Management
- Create and view support tickets.
- Track ticket status and priority.
- Support ticket assignment and resolution workflows.
- Escalate issues that require human assistance.

### Knowledge Base
- Manage product help articles.
- Store help content and article versions.
- Retrieve relevant information through semantic search.
- Support knowledge management workflows.

### Supervisor Dashboard
- View existing organizations.
- Access organization and membership management features.
- Manage supported plans and organization assignments according to permissions.

### Role-Based Navigation
The application displays navigation options based on the logged-in user's role.

| Role | Main navigation |
|---|---|
| Customer | Subscriptions, Support |
| Support Specialist | Specialist Tickets |
| Knowledge Manager | Knowledge Base |
| Supervisor | Supervisor, Subscriptions, Support, Specialist Tickets, Knowledge Base |

The available actions within each section are controlled separately by backend authorization rules.

## User Roles

### Customer
- Access permitted subscription information.
- View plan features and entitlements.
- Ask questions through AI support.
- Create and track support tickets.

### Support Specialist
- Access the specialist ticket dashboard.
- Review and manage permitted tickets.
- Work on customer issues and escalate them when necessary.

### Knowledge Manager
- Create and maintain help articles.
- Manage product documentation.
- Maintain the knowledge base used for support information retrieval.

### Supervisor
- Access the supervisor dashboard.
- View organizations and manage supported organization workflows.
- Access other permitted support and management features.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JWT-based authentication and role-based middleware |
| AI Model | Ollama |
| AI Integration | LangChain JavaScript |
| Semantic Search | Embeddings and MongoDB Atlas Vector Search |
| Validation | Zod, where integrated |
| API Testing | Postman |

## Project Structure

The repository is organized into frontend and backend components. The exact filenames may evolve as the project develops.

```text
subscription-support-desk/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── services/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── routes/
│   ├── package.json
│   └── .env
│
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the application:

- [Node.js](https://nodejs.org/) and npm.
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account and database.
- [Ollama](https://ollama.com/) for local language-model inference.
- [Git](https://git-scm.com/) to clone the repository.
- [Postman](https://www.postman.com/) for API testing.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/manvithagolla08-ui/subscription-support-desk.git
cd subscription-support-desk
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure the backend environment

Create a `.env` file inside the `backend` directory. Add the required database connection string and authentication secret using the variable names expected by the backend code.

Example configuration:

```env
PORT=5000
SECRET_KEY=your_local_development_secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=qwen3:4b
```

Add your MongoDB Atlas connection variable as well. Check the backend database connection file to confirm whether it expects `MONGO_URI`, `MONGODB_URI`, or another name.

Replace example secrets with your own local development values. Never commit actual credentials or production secrets.

### 4. Configure MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user with appropriate permissions.
3. Configure network access for your development environment.
4. Copy the connection string.
5. Add it to the backend `.env` file using the variable name required by the application.

Make sure the database contains the required collections and seed data before testing the application.

### 5. Set up Ollama

Install and start Ollama, then pull the default chat model:

```bash
ollama pull qwen3:4b
```

Ensure the Ollama service is running and accessible at the configured base URL.

If the application uses a separate embedding model for semantic search, install that model too, using the model name configured in the embedding service.

### 6. Start the backend

From the `backend` directory, run:

```bash
node server.js
```

If the backend defines a development script in `package.json`, you can use that script instead.

The backend should start on the configured port, typically `5000`.

### 7. Install frontend dependencies

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

If your frontend directory has a different name, use the directory containing the React application's `package.json`.

### 8. Start the frontend

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal, commonly:

```text
http://localhost:5173
```

Ensure that the frontend API client points to the correct backend URL.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `SECRET_KEY` | JWT authentication secret |
| MongoDB connection variable | Connects the backend to MongoDB Atlas |
| `OLLAMA_BASE_URL` | Ollama server address |
| `OLLAMA_CHAT_MODEL` | Chat model used for AI responses |

Additional variables may be required by individual services. Check the backend configuration before deployment.

**Important:** Do not commit `.env` files, database credentials, API keys, or private tokens to GitHub. Use an appropriate `.gitignore` file and provide a separate environment template without real secrets.

## AI Integration

The AI support workflow is designed to combine language-model responses with application data.

A typical request follows this sequence:

1. A user submits a product-related question.
2. The backend retrieves relevant help information.
3. Authorized application services retrieve applicable plan, entitlement, or service-status information when needed.
4. The retrieved context is passed to the language model.
5. The model generates an answer based on the supplied context.
6. The application returns the answer to the frontend.

### Retrieval-Augmented Generation (RAG)

The knowledge retrieval workflow uses embeddings and semantic search to find relevant help content rather than relying only on exact keyword matches.

MongoDB Atlas Vector Search is used for similarity-based retrieval when the vector index and associated services are configured.

### AI Safety and Data Access

- AI responses should be grounded in retrieved documentation and verified application data.
- Access to organization, account, and ticket information must be validated by the backend.
- Subscription changes, refunds, and other sensitive operations should remain under authorized human control.
- Missing or unavailable information should not be invented by the language model.

## API and Backend

The Express backend exposes endpoints for authentication, organizations, plans, entitlements, help articles, tickets, service status, and related application workflows.

Known route groups include:

| Route group | Purpose |
|---|---|
| `/api/organizations` | Organization and membership workflows |
| `/api/service-status` | Service-status information, if mounted in the current backend |
| Authentication routes | Login, registration, and identity verification |
| Help routes | Help article retrieval and knowledge management |
| Ticket routes | Ticket creation, retrieval, and management |
| Plan and entitlement routes | Subscription and feature information |
| AI support routes | AI-generated support responses |

The exact HTTP methods, request bodies, and authentication requirements are defined by the route implementations. Consult the backend route files for the current endpoint list.

## Security

The application uses authentication and role-based authorization to control access to protected features.

Security considerations include:

- Validate authenticated users on the backend.
- Check permissions before returning organization or customer data.
- Derive organization access from trusted membership records rather than trusting client-supplied organization IDs.
- Validate incoming request data.
- Keep secrets in environment variables.
- Prevent users from accessing another organization's private conversations or tickets.
- Restrict sensitive account operations to authorized roles.

Frontend route protection and hidden navigation links improve the user experience but do not replace backend authorization.

## Testing

The project can be tested using Postman and the application's frontend.

Recommended checks include:

- User registration and login.
- Requests with valid and invalid authentication tokens.
- Access permissions for each user role.
- Organization and membership operations.
- Plan and entitlement retrieval.
- Help article creation and retrieval.
- Ticket creation, assignment, and status updates.
- AI responses to questions supported by the knowledge base.
- Behavior when relevant help information is unavailable.
- Organization isolation and unauthorized data-access attempts.
- MongoDB persistence and vector-search retrieval, when configured.

Test results should be verified against the current implementation before describing a feature as fully tested.

## Future Improvements

Potential improvements include:

- More comprehensive automated backend and frontend tests.
- Improved AI response evaluation and source attribution.
- Better ticket similarity and grouping.
- More detailed support analytics.
- Enhanced conversation history and escalation workflows.
- Improved deployment and monitoring.
- Expanded accessibility and responsive design.

## Contributors

Developed collaboratively as a full-stack AI project.

The project brings together frontend development, backend APIs, database modeling, authentication, AI integration, knowledge retrieval, and support workflows.

## License

A license has not been specified yet. Add a `LICENSE` file if the project will be distributed under a particular open-source license.

---

**Subscription Product Support Desk** — combining structured support workflows with AI-assisted product knowledge.
