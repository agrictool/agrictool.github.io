# RAISSAT Digital Food Systems Platform

Web platform for a one-day training programme that prepares FUTA students for digital food systems, covering AI, data and innovation from farm to fork. Participants register, take a before-and-after assessment and earn a certificate. Anyone can browse a directory of digital agriculture tools.

[Live site](https://agrictool.github.io/) · [Report an issue](../../issues)

## About

The platform supports the RAISSAT Community Impact Project at the Federal University of Technology, Akure (FUTA), Nigeria, led by Oladipo Esther Modupe. It has three connected parts:

- **Programme portal** for participants: registration, assessments and certificates.
- **Toolkit directory** that anyone can search, with a form to suggest new tools.
- **Administrator dashboard** for the organisers.

## Features

For visitors
- Search and filter a public directory of digital agriculture tools, with a detail page for each
- Suggest a tool for the directory; organisers review it before it appears
- Read about six focus areas: precision agriculture and GIS, AI and data analytics, food safety and traceability, supply chain and logistics, livestock and aquaculture technology, and agricultural data and research tools

For participants
- Create an account and sign in, with password reset
- Follow the programme phases from a personal dashboard
- Complete a pre-training and a post-training assessment, one attempt each
- Download an A4 certificate once both assessments are done and the programme allows it

For organisers
- See participants in a searchable, sortable table and export it
- Review submitted assessments and reopen them if needed
- See impact charts, score the group challenge, and review toolkit suggestions
- Open and close programme phases, manage certificates and collaborators, and edit programme settings

## Tech stack

React · Vite · TypeScript · Tailwind CSS · React Router · Firebase (Authentication, Firestore, Storage) · Recharts · jsPDF · GitHub Actions and GitHub Pages

## Privacy and security

- Administrator access is granted outside the app, never through the website itself.
- Database rules decide who can read and write. Phases, one-attempt assessments and certificate eligibility are enforced on the server, not only in the interface.
- Private toolkit details are kept apart from public ones and can be read only by administrators.
- Administrator actions are written to an append-only audit log.
- No secret keys are stored in this repository. A draft privacy notice is on the site at [/privacy](https://agrictool.github.io/privacy).

## Project structure

```
src/pages/       public, student, toolkit and admin pages
src/components/  shared layout, forms and interface parts
src/lib/         Firebase setup, constants and assessment questions
firestore.rules  database access rules
storage.rules    file storage access rules
tests/           security rules tests
scripts/         one-time administrator setup script
.github/         automatic deploy to GitHub Pages
```

## For the project team

Setup, first-administrator setup and deployment steps are in [DEPLOYMENT.md](DEPLOYMENT.md) and [SETUP_GUIDE.md](SETUP_GUIDE.md). How the system fits together is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Open an issue to report a bug or suggest an idea. Do not post personal details or participant data in issues.

## Credits

Project lead: Oladipo Esther Modupe, RAISSAT Community Impact Project, FUTA, Akure. Icons: Lucide.
