# EduSmartAI - Intelligent Educational Platform

EduSmartAI is an intelligent educational management platform featuring AI-powered predictive models and a Retrieval-Augmented Generation (RAG) chatbot helper. The system is designed to support students, lecturers, and system administrators with personalized learning analytics and interactive support.

---

## 📂 Project Structure

This repository is organized as a monorepo containing the following components:

* **[backend/](file:///c:/Users/bahaa/OneDrive/سطح%20المكتب/EduSmartAI/BAHAAW/backend):** FastAPI python server handles API routes, JWT authentication, and ML inference.
* **[edusmartai-frontend/](file:///c:/Users/bahaa/OneDrive/سطح%20المكتب/EduSmartAI/BAHAAW/edusmartai-frontend):** React client interface built with Create React App and Tailwind CSS.
* **[Saved_Models/](file:///c:/Users/bahaa/OneDrive/سطح%20المكتب/EduSmartAI/BAHAAW/Saved_Models):** Binary joblib files containing trained Random Forest models and scalers for online predictions.
* **[Training_Data/](file:///c:/Users/bahaa/OneDrive/سطح%20المكتب/EduSmartAI/BAHAAW/Training_Data):** Data processing notebooks and datasets used for OULAD models training.
* **[AXI_Training/](file:///c:/Users/bahaa/OneDrive/سطح%20المكتب/EduSmartAI/BAHAAW/AXI_Training):** Data processing notebooks and datasets used for AXI behavioral level training.

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI)
Navigate to the `backend/` directory and perform the following:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Windows CMD:
.\venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Create local environment config
cp .env.example .env
# Edit '.env' to configure your database url, JWT secret, and GROQ_API_KEY.

# Run database migrations and seed default Jordan university datasets
python seed_data.py

# Launch the FastAPI uvicorn development server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
The API documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup (React)
Navigate to the `edusmartai-frontend/` directory and perform the following:

```bash
# Copy frontend env template
cp .env.example .env

# Install Node dependencies
npm install

# Start development server
npm start
```
The application will launch at `http://localhost:3000`.

---

## 🤖 Machine Learning & Datasets

### AXI Model
Trains on student interactions (raised hands, visited resources, discussions, etc.) and predicts an academic level (High, Medium, Low).
* Dataset: `AXI_Training/xAPI-Edu-Data.csv` (included)

### OULAD Model
Trains on the Open University Learning Analytics Dataset (OULAD) to predict if a student is at risk of failing.
* **Important:** Due to size constraints, the file `Training_Data/studentVle.csv` (453.8 MB) is excluded from this repository.
* **How to acquire:** Download the dataset from the official [Open University Learning Analytics Dataset Portal](https://analyse.kmi.open.ac.uk/resources/open_dataset), extract the `studentVle.csv` file, and place it in the `Training_Data/` directory if you wish to re-train the models.

---

## ⚙️ Seed Accounts for Testing
After running `seed_data.py`, you can log in with:

| Account Type | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@edu.com` | `admin123` |
| **Lecturer** | `dr.salem@edu.com` | `lecturer123` |
| **Student** | `ahmed@edu.com` | `student123` |
