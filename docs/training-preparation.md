# Workout preparation

Opening the before-workout questions creates a session snapshot, but it remains replaceable until any answer or activity is recorded. `canReplaceTrainingPreparation` requires a programme session with no check-ins, set logs, pain logs, exercise feedback or note. Legacy sessions remain protected. Direction/equipment changes remove an empty preparation and save preferences in one transaction; starting a different plan replaces the empty preparation in one transaction. Storage failures roll back the replacement.

The question screen links back to the editor, which restores the prepared plan including edited dosage. Home permits changing direction/equipment and switching A/B while preparing. Once the before-workout answers are saved, normal active-session restrictions apply. The session clock/date start from that answer's timestamp, excluding preparation time.

Experience is saved on new session snapshots and displayed separately as Träningsvana. It describes training experience, not exercise technique difficulty or reported effort. Old active sessions may use the unchanged current programme preferences to display experience; historical records without the field do not infer a past level. Backup accepts the optional field, preserving older records.
