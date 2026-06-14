# StudyShare
Here is the project: [StudyShare](rss-study-share.vercel.app)
## Inspiration
Every student has faced the night-before-test panic, staring at incomplete notes and wishing for access to organized explanations. We realized that schools have vast academic knowledge but no central, safe place to share notes, summaries, and study guides. Our idea stemmed from one question: What if technology and AI could create a collaborative studying community?

## What it does
StudyShare is a secure note-sharing platform helping students learn smarter and support each other. Key features include:
Note uploads with filters for subject, visibility, and brief descriptions, helping students find exactly what they need.
Private and public chats to communicate one-on-one or join broader school communities.
Detailed user profiles showcasing bios and note contributions.
AI-powered recommendations that analyze content and ratings to suggest the top 3 most relevant notes for a lesson.
School affiliation for prioritizing notes and enabling connections within the same school.
Other features:
- dark/light mode
- profile editing
- search filters
- multiple note types (lecture, lab, etc.).

## How we built it
We explored multiple design iterations before developing the platform using the AI-powered Lovable environment and integrating the Gemini 2.5 API directly into our database. Together, these tools enabled us to build a scalable, responsive system that would have been far more complex and time-consuming to create through traditional development methods.

## Challenges we ran into
One major challenge was enabling users to contact and message each other reliably. We resolved this by restructuring how user data and messages were stored. Another issue involved ensuring students could access uploaded files; we addressed this by adding ‘private’ and ‘public’ visibility settings, allowing only public files to be accessible across the platform.

## Accomplishments that we're proud of
We are proud of our prompt engineering with Lovable, allowing us to incorporate multiple features into a usable platform. Removing the browse section and replacing it with an AI notes recommender solved major storage and accessibility issues, a breakthrough for our workflow. 

## What we learned
This hackathon taught us the value of generating detailed ideas and collaborating as a team. Clear planning allowed us to create high-quality prompts for Lovable, maximizing the effectiveness of AI tools in development. We learned how effectively we can utilize AI to convert our vision to a tangible product.

## What's next for StudyShare
We envision StudyShare as an open-source notes platform like GitHub or NextDoor where all students can contribute to each other’s academic success and contact each other for resources and help. Future plans include a used textbook exchange, so peers can donate or sell books at a discounted price. Finally, we want to integrate tutoring and academic services, making our platform the central hub for student learning and connection.

## Coming soon (Bonus)
We want to add the following features in the future:
- An about us page explaining what our website is used for
- Contact us/help section for users having trouble navigating our website
- Send feedback at the bottom on what features/improvements we could make
- A tooltip for when a user hovers over a section to provide basic details about it

