package ru.variantum.service.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import ru.variantum.domain.*;
import ru.variantum.dto.request.SubmitAnswersRequest;
import ru.variantum.exception.ResourceNotFoundException;
import ru.variantum.repository.*;
import ru.variantum.security.TokenSecrets;
import java.time.OffsetDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FormServiceTest {
    private final FormStudentRepository students = mock(FormStudentRepository.class);
    private final StudentSubmissionRepository submissions = mock(StudentSubmissionRepository.class);
    private final StudentSubmissionAttachmentRepository attachments = mock(StudentSubmissionAttachmentRepository.class);
    private final VariantRepository variants = mock(VariantRepository.class);
    private final TaskRepository tasks = mock(TaskRepository.class);
    private final ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule());
    private final FormService service = new FormService(mock(FormAssignmentRepository.class), students,
            mock(FormVariantTokenRepository.class), submissions, attachments, mock(ProjectRepository.class), variants, tasks, json);

    @Test void receiptHidesAnswersAndBindsTheStudentToTheirToken() {
        UUID assignmentId = UUID.randomUUID(), variantId = UUID.randomUUID(), studentId = UUID.randomUUID();
        var student = FormStudent.builder().id(studentId).assignmentId(assignmentId).variantId(variantId).fullName("Иван Иванов").build();
        when(students.findByAccessTokenForUpdate("student-token")).thenReturn(Optional.of(student));
        when(variants.findById(variantId)).thenReturn(Optional.of(Variant.builder().id(variantId).indexInProject(1).build()));
        when(tasks.findByVariantIdOrderByIndexInVariantAsc(variantId)).thenReturn(List.of());
        when(submissions.save(any())).thenAnswer(call -> {
            StudentSubmission saved = call.getArgument(0);
            assertEquals("Иван Иванов", saved.getStudentName());
            assertEquals(studentId, saved.getFormStudentId());
            saved.setId(UUID.randomUUID()); saved.setSubmittedAt(OffsetDateTime.now()); return saved;
        });
        var receipt = service.submitAnswers("student-token", new SubmitAnswersRequest("Чужое имя", null, List.of()));
        var document = json.valueToTree(receipt);
        assertEquals(3, document.size());
        assertFalse(document.has("correctAnswersJson"));
        assertFalse(document.has("autoScore"));
        assertNotNull(receipt.attachmentToken());
    }

    @Test void attachmentRequiresItsOwnReceiptToken() {
        UUID studentId = UUID.randomUUID(), submissionId = UUID.randomUUID();
        var work = StudentSubmission.builder().id(submissionId).formStudentId(studentId)
                .attachmentTokenHash(TokenSecrets.hash("correct-upload-token")).build();
        when(submissions.findByIdForUpdate(submissionId)).thenReturn(Optional.of(work));
        when(students.findByAccessToken("student-token")).thenReturn(Optional.of(FormStudent.builder().id(studentId).build()));
        assertThrows(ResourceNotFoundException.class, () -> service.uploadAttachment("student-token", submissionId,
                "wrong-token", new MockMultipartFile("file", "a.txt", "text/plain", "test".getBytes())));
        verifyNoInteractions(attachments);
    }

    @Test void anotherStudentCannotAttachToTheWork() {
        UUID submissionId = UUID.randomUUID();
        var work = StudentSubmission.builder().id(submissionId).formStudentId(UUID.randomUUID())
                .attachmentTokenHash(TokenSecrets.hash("upload-token")).build();
        when(submissions.findByIdForUpdate(submissionId)).thenReturn(Optional.of(work));
        when(students.findByAccessToken("other-student")).thenReturn(Optional.of(FormStudent.builder().id(UUID.randomUUID()).build()));
        assertThrows(ResourceNotFoundException.class, () -> service.uploadAttachment("other-student", submissionId,
                "upload-token", new MockMultipartFile("file", "a.txt", "text/plain", "test".getBytes())));
        verifyNoInteractions(attachments);
    }
}
