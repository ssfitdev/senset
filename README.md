# SensET Exam System - Easy User Guide


This guide is written for non-technical coordinators and exam invigilators to help you manage the SensET examination system.

---

## Part 1: The Admin Panel (For Coordinators & Invigilators)

The Admin Panel is the control center of the examination. You can access it in your browser at:
👉 **`https://senset.ssfkerala.org/admin/login`**

### 1. Signing In
1. Open the Admin URL.
2. Enter the Admin Email: **`******`**
3. Enter the Admin Password: **`******`**
4. Click **Sign In**.

---

### 2. The Dashboard (Home Screen)
The home screen gives you a quick snapshot of the active exam, including:
* The current state (Is the exam open or closed?).
* Quick count of registered students.
* Total number of questions in the system.

---

### 3. Exam Configuration (Settings)
This screen controls when and how the exam runs.
* **Window Opens / Closes**: Sets the calendar date and time when students are allowed to start the exam.
* **Duration per student**: The time limit a student has once they click "Start" (e.g., 40 minutes).
* **Questions per student**: How many questions are randomly pulled from the question bank for each student (e.g., 50 questions).
* **Exam Open (Toggle Switch)**: Turns the exam system on or off. If this is turned off, no student can start the exam, even if it is within the open window.
* **Show results to students (Toggle Switch)**: 
  * If **ON**, students will see their final score immediately after submitting.
  * If **OFF**, students will only see a "Thank you, your exam is submitted" screen.
* *Remember to click **Save Configuration** after making changes.*

---

### 4. Managing Students
In the **Students** tab, you register the candidates who are allowed to write the exam.

* **Add a Single Student**: Click **Add Student**, fill in their ID, Name, Phone Number, District, and Division, and click save.
* **Upload Roster (Bulk)**: 
  1. Click the file selector under **Upload roster CSV**.
  2. Select your spreadsheet saved in `.csv` format. It must have these exact columns: `studentId,name,phone,district,division`.
  3. Review the row count and click **Upload**.
* **Delete a Student**: Click the **Trash Can** icon next to a student's name to remove them.

---

### 5. Managing Questions (The Question Bank)
In the **Questions** tab, you manage the pool of questions the exam will randomly select from.

* **Add a Single Question**: Click **Add Question**, type the question text, define options A, B, C, and D, pick the correct option letter, and optional category (e.g., General Knowledge).
* **Upload Question Bank (Bulk)**: 
  1. Select your spreadsheet saved in `.csv` format. 
  2. The columns must be: `text,optionA,optionB,optionC,optionD,correctOption,category` (where `correctOption` is a single letter: A, B, C, or D).
  3. Click **Upload**.

---

### 6. Live Attendance (Monitoring the Exam)
This is a real-time table showing active student progress.
* You will see which students have started.
* A live countdown timer shows how much time is left on each student's exam.
* Status will show **In Progress** or **Submitted**.

---

### 7. Results & Feedback
* **Results**: Once students submit, their score, total attempted, correct, and wrong answers are listed here. You can copy or inspect scores.
* **Feedback**: Students can submit suggestions or report issues from their exam screen. You can read their messages in this tab.

---

## Part 2: The Student Exam Module (For Candidates)

Students take the exam at the main page:
👉 **`https://senset.ssfkerala.org/`**

### 1. Student Sign In
* Students sign in using either their **Student ID** (e.g., STU10001) or their registered **Phone Number**.
* If their ID/Phone is not in the system (or the admin turned off the exam), they will see an error.

### 2. Instructions Screen
* Once logged in, students see the exam details (duration, number of questions) and important instructions.
* They must read the instructions and click **Start Exam** when ready. The timer starts the moment they click this button.

### 3. Answering Questions
* Questions are shown **one at a time**.
* Students select an option (A, B, C, or D) to lock in their answer. They can change their choice at any time before submitting.
* **Navigation**: They can use the **Next** and **Previous** buttons to jump between questions.
* **Bookmarking / Review**: Students can flag a question if they are unsure and want to return to it later.

### 4. Timer & Submission
* A countdown timer is displayed at the top. It turns red when time is running low.
* **Manual Submit**: Once finished, the student clicks **Submit Exam** at the end.
* **Automatic Submit**: If the timer reaches `00:00`, the exam immediately saves their progress and submits itself automatically. No progress is lost.

### 5. Post-Submission
* If the admin enabled results visibility, the student is greeted with their score, percentage, and a breakdown of their correct/incorrect choices.
* If results visibility is disabled, they will see a success confirmation page.
