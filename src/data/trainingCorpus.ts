import type { DocumentCategory } from '../types';

export interface LabeledTrainingExample {
  text: string;
  category: DocumentCategory;
  split: 'train' | 'test';
}

/**
 * Curated academic document classification dataset (60 labeled campus notices,
 * 70% training / 30% holdout test split) spanning all 6 required campus categories.
 */
export const TRAINING_CORPUS: LabeledTrainingExample[] = [
  // 1. Examination announcements (7 train, 3 test)
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'End-semester theory examination timetable for BCA Semester V has been published by the Examination Cell. Hall tickets must be downloaded before 10 December 2026.',
  },
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'Internal assessment mid-term test schedule for BCA-302 Data Structures and BCA-304 Machine Learning. Seating plan will be posted outside Examination Hall B.',
  },
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'Practical viva voce and laboratory examination dates for final year students. Carry signed lab records and university admit card.',
  },
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'Applications for paper revaluation, rechecking, and supplementary backlog examination forms are open until 18 December 2026 at the Controller of Examinations desk.',
  },
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'Guidelines for invigilators and candidates during semester exams. Electronic gadgets and smartwatches are strictly prohibited inside the exam hall.',
  },
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'Revised question paper pattern and grading rubric for end-term university assessment in Natural Language Processing and Deep Learning.',
  },
  {
    category: 'Examination announcements',
    split: 'train',
    text: 'Students having backlog papers in Semester II and IV must fill the arrear exam registration form and obtain hall ticket approval.',
  },
  {
    category: 'Examination announcements',
    split: 'test',
    text: 'Final semester project viva examination schedule announced. External examiners will evaluate BCA AI & ML capstone presentations on 14 December 2026.',
  },
  {
    category: 'Examination announcements',
    split: 'test',
    text: 'Admit card distribution for November-December university exams starts tomorrow. Check roll number and exam seating arrangement on the portal.',
  },
  {
    category: 'Examination announcements',
    split: 'test',
    text: 'Makeup internal test for students who missed mid-semester evaluation due to medical leave will be conducted on 26 November 2026.',
  },

  // 2. Academic notices (7 train, 3 test)
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Minimum 75 percent classroom attendance is mandatory for all BCA and MCA students as per Academic Affairs regulations. Shortfall lists will be released monthly.',
  },
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Updated syllabus and credit structure for elective courses in Artificial Intelligence, Cloud Computing, and Database Management Systems for Academic Year 2026-27.',
  },
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Submission of minor project synopsis and mentor allocation list for Department of Computer Applications. Submit approved proposal to faculty guide.',
  },
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Course registration window for open electives and interdisciplinary audit subjects opens on Monday via the Academic Portal.',
  },
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Class timetable revision for Semester IV Section A and B. Python Programming lab sessions are moved to AI & ML Lab 2 on Wednesdays.',
  },
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Mandatory summer internship credit report submission guidelines. Students must submit company completion certificate and faculty evaluation diary.',
  },
  {
    category: 'Academic notices',
    split: 'train',
    text: 'Academic calendar for Even Semester commencement, teaching weeks, assignment submission milestones, and faculty advisory meetings.',
  },
  {
    category: 'Academic notices',
    split: 'test',
    text: 'Department of Computer Applications invites elective preferences for Semester VI curriculum including Computer Vision and Reinforcement Learning.',
  },
  {
    category: 'Academic notices',
    split: 'test',
    text: 'Notice regarding lab assignment submission deadlines and continuous classroom evaluation marks uploaded by course instructors.',
  },
  {
    category: 'Academic notices',
    split: 'test',
    text: 'Attendance shortage condonation applications with medical certificates must be endorsed by the Head of Department before semester closure.',
  },

  // 3. Fee-related announcements (7 train, 3 test)
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Semester tuition fee payment circular for Academic Session 2026-27. Pay Rs. 42,500 via online NEFT, UPI, or bank challan at the Accounts & Finance Office.',
  },
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Last date to clear pending hostel mess dues and library late fine without late penalty is 30 November 2026. Late fee of Rs. 500 per week applies thereafter.',
  },
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Merit-cum-means scholarship disbursement and tuition fee waiver applications are invited by the Scholarship Cell. Submit income certificate and fee receipt.',
  },
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Examination registration fee of Rs. 1,800 per regular semester and Rs. 450 per backlog paper must be remitted on the Student Payment Portal.',
  },
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Caution deposit refund procedure for graduating batches. Submit no-dues clearance form and bank account details to Accounts Office.',
  },
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Installment facility approved for semester fees. First installment of 60 percent tuition is due before registration; balance payment due in January.',
  },
  {
    category: 'Fee-related announcements',
    split: 'train',
    text: 'Bus transport pass renewal charges and annual laboratory development fee structure revised for the upcoming academic semester.',
  },
  {
    category: 'Fee-related announcements',
    split: 'test',
    text: 'Reminder to settle outstanding semester tuition dues and download digital payment receipt from the university finance portal to avoid late penalty.',
  },
  {
    category: 'Fee-related announcements',
    split: 'test',
    text: 'Post-matric scholarship fee reimbursement verification camp will be held at Accounts & Finance Office. Bring original fee challan.',
  },
  {
    category: 'Fee-related announcements',
    split: 'test',
    text: 'Hostel accommodation charges and security deposit payment schedule for newly admitted undergraduate students.',
  },

  // 4. College events (7 train, 3 test)
  {
    category: 'College events',
    split: 'train',
    text: 'Annual TechFest InnovateAI 2026 and 24-hour campus hackathon hosted by the AI Coding Club at Main Auditorium. Register teams of four to win cash prizes.',
  },
  {
    category: 'College events',
    split: 'train',
    text: 'Guest lecture and hands-on workshop on Applied Natural Language Processing and PyTorch by industry data scientists in Seminar Hall A.',
  },
  {
    category: 'College events',
    split: 'train',
    text: 'Inter-college cultural fest, music night, debate championship, and drama showcase organized by the Student Welfare Office on campus grounds.',
  },
  {
    category: 'College events',
    split: 'train',
    text: 'Annual Sports Meet and athletics tournament registration open at the Sports Complex. Track events, football, and badminton trials start Friday.',
  },
  {
    category: 'College events',
    split: 'train',
    text: 'National Student Research Symposium and poster presentation competition on Sustainable Computing. Call for papers and keynote speaker lineup.',
  },
  {
    category: 'College events',
    split: 'train',
    text: 'Campus placement preparation bootcamp, resume clinic, and mock interview drive organized by the Training & Placement Cell.',
  },
  {
    category: 'College events',
    split: 'train',
    text: 'Robotics club demonstration day and open-source contribution sprint at the Innovation Center. Certificates of participation provided to attendees.',
  },
  {
    category: 'College events',
    split: 'test',
    text: 'Invitation to the Data Science seminar and live coding competition organized by Department of Computer Applications at Main Auditorium.',
  },
  {
    category: 'College events',
    split: 'test',
    text: 'Annual Convocation ceremony rehearsal and alumni networking meetup scheduled for Saturday evening in the campus amphitheater.',
  },
  {
    category: 'College events',
    split: 'test',
    text: 'Photography club exhibition and startup pitch day celebrating student entrepreneurs at Innovation Center.',
  },

  // 5. Holidays (7 train, 3 test)
  {
    category: 'Holidays',
    split: 'train',
    text: 'The college campus, administrative offices, and classrooms will remain closed on 25 December 2026 on account of Christmas public holiday.',
  },
  {
    category: 'Holidays',
    split: 'train',
    text: 'Winter vacation break declared for all undergraduate programs from 24 December 2026 to 3 January 2027. Regular classes resume on 4 January 2027.',
  },
  {
    category: 'Holidays',
    split: 'train',
    text: 'Gazetted national holiday declared for Republic Day on 26 January. Flag hoisting ceremony at 8:30 AM; all teaching sessions suspended for the day.',
  },
  {
    category: 'Holidays',
    split: 'train',
    text: 'Diwali festival vacation notice: Academic blocks and laboratories will remain closed for five days during the festival break.',
  },
  {
    category: 'Holidays',
    split: 'train',
    text: 'List of official public holidays and restricted campus closures approved by the Registrar Office for the calendar year.',
  },
  {
    category: 'Holidays',
    split: 'train',
    text: 'Due to heavy rainfall alert issued by the district collector, the college declares an unscheduled weather holiday tomorrow. All classes are cancelled.',
  },
  {
    category: 'Holidays',
    split: 'train',
    text: 'Mid-semester autumn recess and festival off-days announced. Hostels remain open while academic instruction pauses until Monday.',
  },
  {
    category: 'Holidays',
    split: 'test',
    text: 'Notice of campus closure on account of regional harvest festival. All lectures and labs remain suspended; college reopens the following morning.',
  },
  {
    category: 'Holidays',
    split: 'test',
    text: 'Summer vacation dates declared for faculty and students following semester conclusion. Administrative counters operate on reduced holiday hours.',
  },
  {
    category: 'Holidays',
    split: 'test',
    text: 'New Year holiday circular: College remains closed on 1 January 2027. Wishing all students and staff a joyful festive break.',
  },

  // 6. General announcements (7 train, 3 test)
  {
    category: 'General announcements',
    split: 'train',
    text: 'Central Library extended reading room hours during December and newly upgraded high-speed campus Wi-Fi network access instructions.',
  },
  {
    category: 'General announcements',
    split: 'train',
    text: 'Mandatory student ID card renewal and biometric entry registration at the Security Desk near Main Gate for campus safety.',
  },
  {
    category: 'General announcements',
    split: 'train',
    text: 'Scheduled IT infrastructure maintenance on the campus intranet portal this Sunday from 2:00 AM to 6:00 AM. Services may be intermittently unavailable.',
  },
  {
    category: 'General announcements',
    split: 'train',
    text: 'New cafeteria menu, hygienic drinking water stations, and eco-friendly plastic-free campus initiative launched across all blocks.',
  },
  {
    category: 'General announcements',
    split: 'train',
    text: 'Lost and found items collected at the Registrar Office reception desk. Students may claim misplaced notebooks, umbrellas, and keys with ID.',
  },
  {
    category: 'General announcements',
    split: 'train',
    text: 'Parking guidelines for student two-wheelers and updated shuttle bus timings between Main Campus and North Hostel Gate.',
  },
  {
    category: 'General announcements',
    split: 'train',
    text: 'Annual campus blood donation and general health checkup camp advisory issued by the Campus Medical Center for student wellbeing.',
  },
  {
    category: 'General announcements',
    split: 'test',
    text: 'Notice regarding new Wi-Fi password rotation and updated printing kiosk locations inside Central Library and Block B corridor.',
  },
  {
    category: 'General announcements',
    split: 'test',
    text: 'Campus shuttle bus route revision and temporary main gate pedestrian diversion due to road resurfacing work.',
  },
  {
    category: 'General announcements',
    split: 'test',
    text: 'Advisory on wearing college identity badges inside campus premises and updated cafeteria operating timings.',
  },
];
