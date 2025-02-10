from explorecourses import *
from explorecourses import filters

connect = CourseConnection()

import csv

# Create CSV with columns for each piece of course information
with open('spring2025_courses.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    # Define headers for all columns
    headers = [
        'Course Code', 'Title', 'GERs', 'Description', 'Units', 'Grading',
        'Component', 'Days', 'Time', 'Location', 'Instructors', 'Final Exam'
    ]
    writer.writerow(headers)

    year = "2024-2025"
    for school in connect.get_schools(year):
        for dept in school.departments:
            courses = connect.get_courses_by_department(
                dept.code,
                filters.SPRING,
                year=year
            )
            for course in courses:
                # Initialize row data with empty strings
                row_data = [''] * len(headers)
                
                # Course code and title
                row_data[0] = f"{course.subject}{course.code}"
                row_data[1] = course.title
                row_data[2] = ', '.join(course.gers) if course.gers else ''
                
                # Description
                row_data[3] = course.description.strip() if course.description else ''
                
                # Units
                if course.units_min == course.units_max:
                    row_data[4] = str(course.units_min)
                else:
                    row_data[4] = f"{course.units_min}-{course.units_max}"
                
                # Grading
                row_data[5] = course.grading_basis
                
                # Section information
                if course.sections and course.sections[0].schedules:
                    section = course.sections[0]
                    schedule = section.schedules[0]
                    
                    row_data[6] = section.component
                    row_data[7] = ', '.join(schedule.days)
                    row_data[8] = f"{schedule.start_time} - {schedule.end_time}"
                    row_data[9] = schedule.location if schedule.location else ''
                    
                    if schedule.instructors:
                        row_data[10] = '; '.join([f"{i.first_name} {i.last_name}" for i in schedule.instructors])
                
                # Final exam
                row_data[11] = 'Yes' if course.final_exam else 'No' if course.final_exam is not None else ''
                
                writer.writerow(row_data)