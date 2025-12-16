## ADDED Requirements

### Requirement: Guest Management
The system SHALL allow users to add, view, update, and remove guests from the guest list. Each guest MUST have a first name and last name.

#### Scenario: Add individual guest
- **WHEN** user provides first name and last name
- **THEN** guest is added to the guest list
- **AND** guest is assigned a unique identifier

#### Scenario: Update guest name
- **WHEN** user modifies a guest's first or last name
- **THEN** the guest's information is updated in the list

#### Scenario: Remove guest
- **WHEN** user selects to remove a guest
- **THEN** guest is removed from the guest list
- **AND** if guest was part of a family, they are removed from the family but family remains

### Requirement: Category and Tag Assignment
The system SHALL allow guests to be assigned to one or more categories (tags) including: Bridal Party, Bride Family, Groom Family, Church Friends, Church Families, Sophie UTS, Sophie High School, Sophie Other, Jason High School, Jason UNSW, Jason Other.

#### Scenario: Assign category to guest
- **WHEN** user assigns a category tag to a guest
- **THEN** guest is associated with that category
- **AND** guest can be filtered and sorted by that category

#### Scenario: Assign multiple categories
- **WHEN** user assigns multiple category tags to a guest
- **THEN** guest is associated with all assigned categories
- **AND** guest appears when filtering by any of those categories

### Requirement: Guest Sorting
The system SHALL provide the ability to sort the guest list alphabetically by first name, alphabetically by last name, or by category.

#### Scenario: Sort by first name
- **WHEN** user selects sort by first name
- **THEN** guests are displayed in alphabetical order by first name (A-Z)

#### Scenario: Sort by last name
- **WHEN** user selects sort by last name
- **THEN** guests are displayed in alphabetical order by last name (A-Z)

#### Scenario: Sort by category
- **WHEN** user selects sort by category
- **THEN** guests are grouped by category
- **AND** within each category, guests are displayed in alphabetical order

### Requirement: Family Grouping
The system SHALL allow guests to be grouped into families. Families can be displayed as bundled units or as individual members.

#### Scenario: Create family group
- **WHEN** user creates a family and adds multiple guests to it
- **THEN** those guests are associated with the family
- **AND** family can be displayed as a single unit

#### Scenario: Display families bundled
- **WHEN** user views guest list in family mode
- **THEN** guests belonging to the same family are displayed together as a family unit
- **AND** family name or primary member name is shown

#### Scenario: Display families as individuals
- **WHEN** user views guest list in individual mode
- **THEN** all guests are displayed as separate individuals
- **AND** family association is still maintained but not visually grouped

#### Scenario: Add guest to existing family
- **WHEN** user assigns an existing guest to a family
- **THEN** guest becomes a member of that family
- **AND** guest appears with the family when in family view mode

#### Scenario: Remove guest from family
- **WHEN** user removes a guest from a family
- **THEN** guest is no longer associated with that family
- **AND** guest appears as an individual in the list

### Requirement: Quick Operations
The system SHALL provide easy and quick methods to add new guests, add families with multiple members, and remove guests.

#### Scenario: Quick add individual guest
- **WHEN** user uses quick add feature with first and last name
- **THEN** guest is immediately added to the list
- **AND** user can continue adding more guests

#### Scenario: Quick add family
- **WHEN** user uses quick add family feature
- **THEN** user can add multiple family members at once
- **AND** all members are automatically grouped into the same family
- **AND** family is added to the guest list

#### Scenario: Quick remove guest
- **WHEN** user selects quick remove action for a guest
- **THEN** guest is immediately removed from the list
- **AND** confirmation may be requested to prevent accidental removal
