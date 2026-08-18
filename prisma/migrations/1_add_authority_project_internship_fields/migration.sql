-- Add authority identity fields
ALTER TABLE `authorities`
    ADD COLUMN `name` VARCHAR(200) NOT NULL,
    ADD COLUMN `email` VARCHAR(255) NOT NULL;

CREATE UNIQUE INDEX `authorities_email_key` ON `authorities`(`email`);

-- Add the optional GitLab project URL
ALTER TABLE `projects`
    ADD COLUMN `gitlab_link` VARCHAR(500) NULL;

-- Add an optional internship grade and enforce the 0 to 20 range
ALTER TABLE `internships`
    ADD COLUMN `grade` TINYINT NULL,
    ADD CONSTRAINT `internships_grade_check`
        CHECK (`grade` IS NULL OR (`grade` >= 0 AND `grade` <= 20));
