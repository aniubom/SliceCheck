**Status:** Ready for Refinement
**Story Points:** 3
**Assignee:** Unassigned

## Problem Statement
Dock managers re-enter slip assignments in two systems every morning. It takes about 40 minutes a day and the two lists drift apart by Friday, so boats get sent to occupied slips.

## User Story
As a dock manager, I want slip assignments entered once and shared with the billing system, so that both lists always match.

## Acceptance Criteria
AC-1: Given a dock manager saves a slip assignment, when billing opens the same boat, then the slip number matches.
AC-2: Given a slip is reassigned, when the change is saved, then billing shows the new slip within 5 minutes.
AC-3: Given billing is offline, when a slip is saved, then the dock manager sees "Billing will update when it reconnects."

## Dependencies
Billing API change owned by the payments team, due March 14.
