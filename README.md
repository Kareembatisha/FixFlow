# FixFlow

**A Full-Stack Service Management System**

## About the Project

FixFlow is a service management platform designed to simplify the process of submitting, managing, assigning, and tracking service requests.

The system connects customers with the internal service team and provides a structured workflow for handling requests from submission to resolution.

## Problem Statement

Managing service requests manually can lead to poor communication, delayed responses, and difficulty tracking request progress.

FixFlow aims to organize this process through a centralized platform where customers can submit requests and the internal team can manage and follow up on them.

## User Roles

The system includes four main roles:

### 1. Customer
- Submit service requests.
- View and track submitted requests.
- Follow request status and updates.

### 2. Technician
- View assigned service requests.
- Handle assigned tasks.
- Update work progress.

### 3. Supervisor
- Oversee service requests.
- Monitor technician activities.
- Follow up on request progress.

### 4. Admin
- Manage users and system access.
- Manage system-level settings.
- Oversee the overall platform.

*Note: These responsibilities represent the initial project scope and may evolve as the requirements are implemented.*

## Tech Stack

- **Frontend:** Angular
- **Backend:** NestJS
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **API:** REST API

## Project Structure

The project consists of two main applications:

- `backend` — NestJS REST API.
- `frontend` — Angular web application.

## Project Status

Currently in the initial development phase.

Development is organized into sprints, starting with backend configuration, authentication, and role-based access control.

## Development Goals

- Build a structured REST API.
- Implement secure authentication using JWT.
- Apply role-based authorization.
- Manage service requests and their lifecycle.
- Build a responsive frontend.
- Follow clean code and testing practices.
