ALTER TABLE student_submissions
    ADD COLUMN form_student_id UUID REFERENCES form_students(id) ON DELETE SET NULL,
    ADD COLUMN attachment_token_hash VARCHAR(64);

CREATE UNIQUE INDEX uq_submission_student ON student_submissions(form_student_id)
    WHERE form_student_id IS NOT NULL;
