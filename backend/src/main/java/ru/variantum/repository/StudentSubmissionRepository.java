package ru.variantum.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import ru.variantum.domain.StudentSubmission;

import java.util.List;
import java.util.UUID;

public interface StudentSubmissionRepository extends JpaRepository<StudentSubmission, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from StudentSubmission s where s.id = :id")
    Optional<StudentSubmission> findByIdForUpdate(UUID id);

    List<StudentSubmission> findByAssignmentId(UUID assignmentId);
    List<StudentSubmission> findByVariantId(UUID variantId);
    boolean existsByAssignmentIdAndStudentName(UUID assignmentId, String studentName);
}
