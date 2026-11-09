I need a quick and easy temporary feature of a website that is essentially a game show answering platform, think like Kahoot. There are multiple players(not finite) that will answer questions using their device. There are 4 categories with 3 questions in each category. There should be an admin(me) that controls when the players see the questions and the answers on their device, and then at the end give superlatives to players based on their score. im being very loose with the directions bc i really dont have time to develop architecture and logic flows myself. Do not add super unneccessary features, keep it simple wherever possible. The only like authorization and credentials you should use is for admin, players join the game simply by entering their name(im not worried about security bc this is a temporary thing that will be deleted after the presentation night). The admin activation should be a hardcoded "if the entered string equals thsis specific name/phrase then they are the admin and there should accept no other admins." 

The main functions should be:
- Landing page: Where players enter their name and join the game.
- Lobby: Show players names to everyone
- Question Page: Where players answer the questions(correct answer doesnt show until all players have answered.)
- Show Answer: Shows correct answer to everyone and displays the player's score(No leaderboard, i want it to be a big reveal at the end.)
- Admin View: Shows who has answered, their guess, and who hasnt yet answered. Then once the answer is revealed there should show an icon to go to the next question. Also, if a problem arises, there should be an option to kick a player if they get locked out when the game starts.
- Results Page: Once the game show is over, it should show all of the players, their scores and their positions. All players, not just the top 5. Then there should be another page that shows superlatives based on who did the best in what category.

Make it logically easy for me to go into the frontend and edit the questions and the answers, i will have to input them all by hand.

Categories:
- Who is to Blame?: 3 Questions, 4 choices each, Blanked out Reddit post captions blaming groups of people for certain occurrances.
- Sam Said What?: 3 Questions, 4 choices each, They are fill in the blanks of quotes of our friend Sam.
- Prescription or Pokemon?: 3 Questions, 2 choices each. Players are presented with a name of either a Pokemon or a Prescription Drug.
- Name that Texter!: 3 Questions, 4 choices each. On the powerpoint i will be running while this game is live I will display a picture of a text message from one of our friends, the players will guess who sent it.

For anythign concerning pictures, dont worry about handling that here, I will do that on the concurrent powerpoint.
