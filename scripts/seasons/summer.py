# scripts/seasons/summer.py — 27 Nov 2026 v1
# Summer: tomatoes, courgettes, peppers, berries, peaches and watermelon;
# cold soups, salads and food that needs little heat.
from build import Book

b = Book('summer', 'Summer', 'sum')
R, M = b.R, b.M

# ---- Starters ----
R('gazpacho', 'Chilled gazpacho', 'starter',
  ['tomato-medium 8', 'cucumber 1', 'pepper-bell 1', 'garlic-clove 1', 'sourdough 1', 'olive-oil 4tbsp', 'white-wine-vinegar 2tbsp', 'salt 1tsp'],
  ['Chop {tomato-medium}, half of {cucumber} and {pepper-bell} roughly.',
   'Put in a blender with {garlic-clove} and torn {sourdough}.',
   'Add {olive-oil}, {white-wine-vinegar} and {salt}.',
   'Blend until smooth.',
   'Chill at least 2 hours, until very cold.',
   'Dice the rest of the cucumber. Scatter over to serve.'],
  serves=4, tier='budget', note='Ripe tomatoes make or break it. Taste and add vinegar if it is flat.')

R('watermelon-feta', 'Watermelon, feta and mint salad', 'starter',
  ['watermelon 600g', 'feta 200g', 'red-onion 1', 'fresh-mint 10g', 'lime 1', 'olive-oil 2tbsp'],
  ['Cut {watermelon} into bite-size chunks. Pile on a plate.',
   'Crumble over {feta}.',
   'Slice {red-onion} very thinly. Scatter over.',
   'Tear over {fresh-mint}.',
   'Squeeze over {lime}. Drizzle with {olive-oil}.'],
  serves=4, tier='budget')

R('burrata-peaches', 'Burrata with peaches and basil', 'starter',
  ['peach 3', 'burrata 2', 'fresh-basil 10g', 'olive-oil 2tbsp', 'balsamic-vinegar 1tbsp', 'black-pepper-ground 0.5tsp'],
  ['Slice {peach} into wedges. Lay on a plate.',
   'Tear {burrata} open. Put in the middle.',
   'Scatter with {fresh-basil}.',
   'Drizzle with {olive-oil} and {balsamic-vinegar}.',
   'Grind over {black-pepper-ground}.'],
  serves=4, tier='special')

R('courgette-fritters', 'Courgette fritters with tzatziki', 'starter',
  ['courgette 2', 'salt 1tsp', 'egg-medium 1', 'flour-plain 4tbsp', 'feta 100g', 'fresh-mint 10g', 'olive-oil 3tbsp', 'tzatziki 200g'],
  ['Grate {courgette}. Toss with {salt} in a sieve. Leave 10 minutes.',
   'Squeeze out as much water as you can.',
   'Mix with {egg-medium}, {flour-plain}, crumbled {feta} and chopped {fresh-mint}.',
   'Put a frying pan on a medium heat. Add {olive-oil}.',
   'Fry spoonfuls 3 minutes each side, until golden.',
   'Serve with {tzatziki}.'],
  serves=4, tier='budget', note='Squeezing the courgette is what stops them going soggy.')

R('chilli-lime-prawns', 'Chilli and lime prawns', 'starter',
  ['olive-oil 2tbsp', 'garlic-clove 2', 'chilli-fresh 1', 'king-prawns-raw 300g', 'lime 2', 'fresh-coriander 10g'],
  ['Put a frying pan on a high heat. Add {olive-oil}.',
   'Slice {garlic-clove} and {chilli-fresh}. Fry 30 seconds.',
   'Add {king-prawns-raw}. Fry 3 minutes, turning, until pink all through.',
   'Squeeze over the juice of one {lime}.',
   'Scatter with {fresh-coriander}. Serve with the other lime in wedges.'],
  serves=4, tier='special')

R('smoked-salmon-cucumber', 'Smoked salmon with pickled cucumber', 'starter',
  ['cucumber 1', 'white-wine-vinegar 3tbsp', 'sugar-caster 1tbsp', 'fresh-dill 10g', 'smoked-salmon 200g', 'creme-fraiche 100ml', 'lemon 1'],
  ['Slice {cucumber} as thinly as you can.',
   'Stir {white-wine-vinegar} with {sugar-caster} until dissolved. Toss with the cucumber.',
   'Leave 15 minutes. Drain.',
   'Lay {smoked-salmon} on plates. Pile the cucumber beside it.',
   'Spoon on {creme-fraiche}. Scatter with {fresh-dill}. Add a wedge of {lemon}.'],
  serves=4, tier='special')

R('melon-prosciutto', 'Melon and prosciutto', 'starter',
  ['watermelon 400g', 'prosciutto 8', 'fresh-mint 5g', 'olive-oil 1tbsp', 'black-pepper-ground 0.5tsp'],
  ['Cut {watermelon} into long wedges. Cut off the rind.',
   'Drape {prosciutto} over the melon.',
   'Tear over {fresh-mint}.',
   'Drizzle with {olive-oil}. Grind over {black-pepper-ground}.'],
  serves=4, tier='everyday', note='Any ripe melon works. Cantaloupe is the classic.')

R('tomato-bruschetta', 'Tomato and basil bruschetta', 'starter',
  ['cherry-tomato 20', 'fresh-basil 10g', 'olive-oil 3tbsp', 'salt 0.5tsp', 'sourdough 4', 'garlic-clove 1'],
  ['Quarter {cherry-tomato}. Put in a bowl.',
   'Tear in {fresh-basil}. Add {olive-oil} and {salt}. Leave 10 minutes.',
   'Toast {sourdough}.',
   'Rub each slice with {garlic-clove} cut in half.',
   'Spoon the tomatoes and their juices on top.'],
  serves=4, tier='budget')

# ---- Mains ----
R('chicken-souvlaki', 'Chicken souvlaki pittas', 'main',
  ['chicken-thigh-boneless 8', 'lemon 1', 'dried-oregano 2tsp', 'garlic-clove 2', 'olive-oil 2tbsp', 'pitta-bread 4', 'tomato-medium 2', 'red-onion 1', 'tzatziki 200g'],
  ['Cut {chicken-thigh-boneless} into chunks.',
   'Toss with the juice of {lemon}, {dried-oregano}, grated {garlic-clove} and {olive-oil}. Leave 20 minutes.',
   'Thread onto skewers.',
   'Grill on a high heat 12 minutes, turning, until charred and cooked through.',
   'Warm {pitta-bread}.',
   'Fill with the chicken, sliced {tomato-medium}, {red-onion} and {tzatziki}.'],
  serves=4, tier='everyday')

R('steak-chimichurri', 'Steak with chimichurri', 'main',
  ['fresh-parsley 30g', 'dried-oregano 1tsp', 'garlic-clove 2', 'chilli-flakes 0.5tsp', 'white-wine-vinegar 2tbsp', 'olive-oil 6tbsp', 'beef-sirloin 4', 'salt 1tsp'],
  ['Chop {fresh-parsley} and {garlic-clove} finely.',
   'Mix with {dried-oregano}, {chilli-flakes}, {white-wine-vinegar} and 5 tbsp of {olive-oil}.',
   'Rub {beef-sirloin} with the rest of the oil and {salt}.',
   'Put a griddle pan on a high heat until smoking.',
   'Cook the steaks 3 minutes each side for medium-rare.',
   'Rest 5 minutes. Slice. Spoon over the chimichurri.'],
  serves=4, tier='special', note='Rest the steak on a warm plate. The juices settle back in.')

R('lamb-salsa-verde', 'Lamb chops with salsa verde', 'main',
  ['fresh-parsley 20g', 'fresh-mint 10g', 'capers 1tbsp', 'garlic-clove 1', 'mustard-dijon 1tsp', 'lemon 1', 'olive-oil 6tbsp', 'lamb-chops 8'],
  ['Chop {fresh-parsley}, {fresh-mint}, {capers} and {garlic-clove} finely together.',
   'Stir in {mustard-dijon}, the juice of {lemon} and 5 tbsp of {olive-oil}.',
   'Rub {lamb-chops} with the rest of the oil.',
   'Put a griddle pan on a high heat.',
   'Cook the chops 3 minutes each side, until browned but pink inside.',
   'Rest 3 minutes. Spoon over the salsa verde.'],
  serves=4, tier='special')

R('sea-bass-tomatoes', 'Sea bass with tomatoes and olives', 'main',
  ['cherry-tomato 20', 'olives-pitted 80g', 'garlic-clove 2', 'olive-oil 3tbsp', 'sea-bass-fillet 4', 'fresh-basil 10g', 'lemon 1'],
  ['Heat the oven to 200C.',
   'Halve {cherry-tomato}. Toss in a dish with {olives-pitted}, sliced {garlic-clove} and 2 tbsp of {olive-oil}.',
   'Roast 15 minutes, until the tomatoes are soft.',
   'Lay {sea-bass-fillet} on top, skin side up. Brush with the rest of the oil.',
   'Roast 8 minutes, until the fish flakes.',
   'Scatter with {fresh-basil}. Squeeze over {lemon}.'],
  serves=4, tier='special')

R('tuna-nicoise', 'Tuna niçoise salad', 'main',
  ['new-potatoes 12', 'green-beans 200g', 'egg-medium 4', 'tuna-steak 4', 'olive-oil 4tbsp', 'cos-lettuce 200g', 'cherry-tomato 16', 'olives-pitted 60g', 'mustard-dijon 1tsp', 'white-wine-vinegar 1tbsp'],
  ['Boil {new-potatoes} 15 minutes. Add {green-beans} for the last 4 minutes. Drain.',
   'Boil {egg-medium} 7 minutes. Cool in cold water. Peel and halve.',
   'Rub {tuna-steak} with 1 tbsp of {olive-oil}. Sear 2 minutes each side in a hot pan.',
   'Whisk the rest of the oil with {mustard-dijon} and {white-wine-vinegar}.',
   'Arrange {cos-lettuce}, the potatoes, beans, {cherry-tomato} and {olives-pitted} on plates.',
   'Top with sliced tuna and the eggs. Spoon over the dressing.'],
  serves=4, tier='special')

R('moules', 'Mussels in white wine and garlic', 'main',
  ['butter-unsalted 30g', 'shallot 2', 'garlic-clove 3', 'wine-white 200ml', 'mussels-cooked 1000g', 'double-cream 100ml', 'fresh-parsley 15g', 'sourdough 4'],
  ['Put a large pan with a lid on a medium heat. Melt {butter-unsalted}.',
   'Chop {shallot} and {garlic-clove}. Fry 4 minutes, until soft.',
   'Add {wine-white}. Bubble 2 minutes.',
   'Add {mussels-cooked}. Cover. Cook 4 minutes, shaking, until hot through.',
   'Stir in {double-cream} and chopped {fresh-parsley}.',
   'Serve in bowls with {sourdough} for the juices.'],
  serves=4, tier='everyday', note='Ready-cooked mussels in their shells only need heating through.')

R('courgette-ricotta-pasta', 'Courgette, lemon and ricotta pasta', 'main',
  ['penne-dry 350g', 'olive-oil 3tbsp', 'courgette 3', 'garlic-clove 2', 'lemon 1', 'ricotta 200g', 'fresh-basil 10g', 'parmesan 30g'],
  ['Cook {penne-dry} in boiling salted water for the time on the packet. Keep a mug of water.',
   'Put a large frying pan on a medium-high heat. Add {olive-oil}.',
   'Grate {courgette} coarsely. Fry with sliced {garlic-clove} 6 minutes, until soft.',
   'Add the drained pasta and the zest and juice of {lemon}.',
   'Stir in {ricotta} and a splash of pasta water until creamy.',
   'Top with torn {fresh-basil} and grated {parmesan}.'],
  serves=4, tier='budget')

R('halloumi-peach-salad', 'Griddled halloumi and peach salad', 'main',
  ['halloumi 2', 'peach 3', 'olive-oil 3tbsp', 'rocket 100g', 'cucumber 1', 'honey 1tbsp', 'lemon 1', 'fresh-mint 10g'],
  ['Slice {halloumi} and {peach}. Brush with 1 tbsp of {olive-oil}.',
   'Put a griddle pan on a high heat.',
   'Griddle the halloumi 2 minutes each side, until striped.',
   'Griddle the peaches 1 minute each side.',
   'Toss {rocket} and sliced {cucumber} on plates. Add the halloumi and peaches.',
   'Whisk the rest of the oil with {honey} and the juice of {lemon}. Spoon over. Add {fresh-mint}.'],
  serves=4, tier='everyday')

R('tomato-galette', 'Tomato and mozzarella galette', 'main',
  ['puff-pastry 320g', 'pesto 3tbsp', 'tomato-medium 4', 'mozzarella 1', 'egg-medium 1', 'fresh-basil 10g'],
  ['Heat the oven to 200C. Unroll {puff-pastry} onto a lined tray.',
   'Spread {pesto} over, leaving a 3 cm edge.',
   'Slice {tomato-medium} and {mozzarella}. Layer over the pesto.',
   'Fold the edges in over the filling.',
   'Brush the pastry with beaten {egg-medium}.',
   'Bake 30 minutes, until golden. Scatter with {fresh-basil}.'],
  serves=4, tier='everyday', swaps=[('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')])

R('ratatouille', 'Ratatouille', 'main',
  ['olive-oil 4tbsp', 'onion-medium 1', 'aubergine 1', 'courgette 2', 'pepper-bell 2', 'garlic-clove 3', 'chopped-tomatoes-tinned 1', 'fresh-basil 15g', 'sourdough 4'],
  ['Put a large pan on a medium heat. Add {olive-oil}.',
   'Chop {onion-medium}. Fry 8 minutes, until soft.',
   'Cut {aubergine}, {courgette} and {pepper-bell} into chunks. Add to the pan.',
   'Fry 10 minutes, stirring, until starting to soften.',
   'Add sliced {garlic-clove} and {chopped-tomatoes-tinned}. Simmer 30 minutes, until soft and rich.',
   'Stir in torn {fresh-basil}. Serve with {sourdough}.'],
  serves=4, tier='budget', note='Better the next day, and good cold.')

R('pepper-chickpea-couscous', 'Roast pepper and chickpea couscous', 'main',
  ['pepper-bell 3', 'red-onion 1', 'olive-oil 4tbsp', 'chickpeas-tinned 1', 'couscous-dry 250g', 'stock-vegetable 300ml', 'lemon 1', 'fresh-parsley 20g', 'pomegranate-seeds 80g'],
  ['Heat the oven to 200C.',
   'Cut {pepper-bell} and {red-onion} into chunks. Toss in a tin with 2 tbsp of {olive-oil}.',
   'Drain {chickpeas-tinned}. Add to the tin. Roast 25 minutes.',
   'Pour hot {stock-vegetable} over {couscous-dry}. Cover 5 minutes. Fluff with a fork.',
   'Stir in the vegetables, the rest of the oil and the juice of {lemon}.',
   'Scatter with chopped {fresh-parsley} and {pomegranate-seeds}.'],
  serves=4, tier='budget')

R('tofu-rice-bowl', 'Sesame tofu rice bowls', 'main',
  ['rice-jasmine-dry 300g', 'tofu-firm 1', 'soy-sauce 3tbsp', 'sesame-oil 1tbsp', 'lime 1', 'cucumber 1', 'edamame-frozen 150g', 'mango 1', 'sesame-seeds 1tbsp', 'spring-onion 3'],
  ['Cook {rice-jasmine-dry} for the time on the packet.',
   'Cut {tofu-firm} into cubes. Toss with {soy-sauce}, {sesame-oil} and the juice of {lime}.',
   'Fry the tofu in a hot pan 6 minutes, until browned. Add the marinade at the end.',
   'Boil {edamame-frozen} 3 minutes. Drain.',
   'Slice {cucumber}, {mango} and {spring-onion}.',
   'Fill bowls with rice, tofu and the vegetables. Sprinkle with {sesame-seeds}.'],
  serves=4, tier='everyday')

# ---- Sides ----
R('tomato-basil-salad', 'Tomato and basil salad', 'side',
  ['tomato-medium 6', 'red-onion 1', 'fresh-basil 10g', 'olive-oil 3tbsp', 'salt 0.5tsp'],
  ['Slice {tomato-medium}. Lay on a plate.',
   'Slice {red-onion} thinly. Scatter over.',
   'Sprinkle with {salt}. Tear over {fresh-basil}.',
   'Drizzle with {olive-oil}.'],
  serves=4, tier='budget')

R('potato-salad', 'Mustard and herb potato salad', 'side',
  ['new-potatoes 24', 'olive-oil 4tbsp', 'wholegrain-mustard 1tbsp', 'white-wine-vinegar 1tbsp', 'spring-onion 4', 'chives 10g'],
  ['Boil {new-potatoes} 15 minutes, until tender. Drain. Halve.',
   'Whisk {olive-oil}, {wholegrain-mustard} and {white-wine-vinegar}.',
   'Toss the warm potatoes in the dressing. || Warm potatoes soak up more flavour.',
   'Stir in sliced {spring-onion} and snipped {chives}.'],
  serves=6, tier='budget')

R('green-bean-salad', 'Green bean and shallot salad', 'side',
  ['green-beans 400g', 'shallot 1', 'mustard-dijon 1tsp', 'white-wine-vinegar 1tbsp', 'olive-oil 3tbsp'],
  ['Boil {green-beans} 4 minutes. Cool under cold water.',
   'Chop {shallot} finely.',
   'Whisk {mustard-dijon}, {white-wine-vinegar} and {olive-oil}.',
   'Toss the beans and shallot in the dressing.'],
  serves=4, tier='budget')

R('cucumber-yoghurt', 'Cucumber with yoghurt and dill', 'side',
  ['cucumber 1', 'greek-yoghurt 200g', 'fresh-dill 10g', 'lemon 1', 'salt 0.5tsp'],
  ['Halve {cucumber} lengthways. Scoop out the seeds. Slice.',
   'Stir into {greek-yoghurt}.',
   'Add chopped {fresh-dill}, the juice of half of {lemon} and {salt}.'],
  serves=4, tier='budget')

R('herb-couscous', 'Lemon and herb couscous', 'side',
  ['couscous-dry 200g', 'stock-vegetable 250ml', 'olive-oil 2tbsp', 'lemon 1', 'fresh-parsley 15g', 'fresh-mint 10g'],
  ['Pour hot {stock-vegetable} over {couscous-dry}. Cover 5 minutes.',
   'Fluff with a fork.',
   'Stir in {olive-oil} and the zest and juice of {lemon}.',
   'Add chopped {fresh-parsley} and {fresh-mint}.'],
  serves=4, tier='budget')

# ---- Puddings ----
R('eton-mess', 'Eton mess', 'pudding',
  ['strawberries 400g', 'sugar-caster 1tbsp', 'double-cream 300ml', 'meringue-nests 6'],
  ['Hull and quarter {strawberries}. Toss with {sugar-caster}. Leave 10 minutes.',
   'Whip {double-cream} to soft peaks.',
   'Break {meringue-nests} into chunks.',
   'Fold the strawberries and meringue through the cream. Serve at once.'],
  serves=6, tier='budget', note='Fold at the last minute, or the meringue softens.')

R('summer-pudding', 'Summer pudding', 'pudding',
  ['raspberries 300g', 'blueberries 200g', 'strawberries 300g', 'sugar-caster 100g', 'bread-white-sliced-loaf 1'],
  ['Put the berries and {sugar-caster} in a pan. Warm 3 minutes, until the juices run.',
   'Cut the crusts off 8 slices of {bread-white-sliced-loaf}.',
   'Dip the bread in the juice. Line a 1 litre bowl, overlapping.',
   'Spoon in {raspberries}, {blueberries} and {strawberries} from the pan.',
   'Cover with more soaked bread. Put a plate and a weight on top.',
   'Chill overnight. Turn out onto a plate.'],
  serves=6, tier='everyday', note='The weight presses the juice into the bread so it turns out deep red.')

R('victoria-sponge', 'Victoria sponge with strawberries', 'pudding',
  ['butter-unsalted 200g', 'sugar-caster 200g', 'egg-medium 4', 'flour-self-raising 200g', 'jam-strawberry 4tbsp', 'double-cream 200ml', 'strawberries 150g'],
  ['Heat the oven to 180C. Line two 20 cm tins.',
   'Beat {butter-unsalted} and {sugar-caster} until pale and fluffy.',
   'Beat in {egg-medium} one at a time.',
   'Fold in {flour-self-raising}. Divide between the tins.',
   'Bake 22 minutes, until springy. Cool.',
   'Spread one cake with {jam-strawberry}, whipped {double-cream} and sliced {strawberries}. Top with the other.'],
  serves=8, tier='budget')

R('roast-peaches', 'Roast peaches with honey yoghurt', 'pudding',
  ['peach 4', 'honey 3tbsp', 'vanilla-extract 1tsp', 'greek-yoghurt 300g', 'pistachios 30g'],
  ['Heat the oven to 200C.',
   'Halve {peach}. Take out the stones. Lay cut side up in a dish.',
   'Drizzle with 2 tbsp of {honey} and {vanilla-extract}.',
   'Roast 15 minutes, until soft and syrupy.',
   'Stir the rest of the honey into {greek-yoghurt}.',
   'Serve the peaches warm with the yoghurt. Scatter with chopped {pistachios}.'],
  serves=4, tier='everyday')

R('watermelon-granita', 'Watermelon and lime granita', 'pudding',
  ['watermelon 800g', 'sugar-caster 60g', 'lime 2'],
  ['Cut the rind off {watermelon}. Blend the flesh until smooth.',
   'Stir in {sugar-caster} and the juice of {lime} until dissolved.',
   'Pour into a shallow box. Freeze 1 hour.',
   'Scrape with a fork. Freeze 3 hours more, scraping every hour, until icy flakes.'],
  serves=6, tier='budget')

R('no-churn-ice-cream', 'No-churn raspberry ripple ice cream', 'pudding',
  ['raspberries 200g', 'icing-sugar 2tbsp', 'double-cream 600ml', 'condensed-milk 397g', 'vanilla-extract 1tsp'],
  ['Mash {raspberries} with {icing-sugar}.',
   'Whip {double-cream}, {condensed-milk} and {vanilla-extract} to soft peaks.',
   'Spoon half into a freezer box. Dot with half the raspberries.',
   'Add the rest of the cream and raspberries. Swirl with a knife.',
   'Freeze 6 hours, until firm.'],
  serves=8, tier='everyday', note='No machine and no stirring: the condensed milk keeps it soft.')

R('mango-passion-fruit', 'Mango and passion fruit with lime', 'pudding',
  ['mango 2', 'passion-fruit 4', 'lime 1', 'fresh-mint 5g'],
  ['Peel {mango}. Slice the flesh off the stone.',
   'Lay on a plate.',
   'Halve {passion-fruit}. Scoop the seeds over.',
   'Squeeze over {lime}. Add {fresh-mint} leaves.'],
  serves=4, tier='budget')

R('cherry-clafoutis', 'Cherry clafoutis', 'pudding',
  ['butter-unsalted 15g', 'cherries 400g', 'egg-medium 3', 'sugar-caster 75g', 'flour-plain 50g', 'milk-whole 250ml', 'vanilla-extract 1tsp', 'icing-sugar 1tbsp'],
  ['Heat the oven to 190C. Butter a baking dish with {butter-unsalted}.',
   'Stone {cherries}. Spread in the dish.',
   'Whisk {egg-medium} and {sugar-caster} until frothy.',
   'Whisk in {flour-plain}, then {milk-whole} and {vanilla-extract}.',
   'Pour over the cherries. Bake 35 minutes, until puffed and barely set in the middle.',
   'Dust with {icing-sugar}. Serve warm.'],
  serves=6, tier='everyday')

# ---- Drinks ----
R('lemonade', 'Homemade lemonade', 'drink',
  ['lemon 4', 'sugar-caster 120g', 'water 300ml', 'sparkling-water 2'],
  ['Zest one {lemon}. Squeeze the juice of all four.',
   'Heat {sugar-caster}, {water} and the zest until the sugar dissolves. Cool.',
   'Stir in the lemon juice. Strain.',
   'Top up with {sparkling-water} and ice.'],
  serves=8, tier='budget')

R('watermelon-cooler', 'Watermelon and mint cooler', 'drink',
  ['watermelon 600g', 'lime 1', 'fresh-mint 10g', 'sparkling-water 1'],
  ['Blend {watermelon} until smooth. Sieve.',
   'Add the juice of {lime}.',
   'Pour over ice with {fresh-mint} leaves.',
   'Top up with {sparkling-water}.'],
  serves=4, tier='budget')

R('rose-spritz', 'Rosé and strawberry spritz', 'drink',
  ['strawberries 100g', 'wine-rose 500ml', 'sparkling-water 1'],
  ['Slice {strawberries}. Put in 4 glasses with ice.',
   'Pour in {wine-rose}.',
   'Top up with {sparkling-water}.'],
  serves=4, tier='everyday')

R('sangria', 'Sangria', 'drink',
  ['wine-red 750ml', 'orange-juice 200ml', 'orange 1', 'apple-medium 1', 'sugar-caster 2tbsp', 'lemonade 330ml'],
  ['Pour {wine-red} and {orange-juice} into a jug.',
   'Slice {orange} and {apple-medium}. Add with {sugar-caster}.',
   'Chill 2 hours.',
   'Add ice and {lemonade} to serve.'],
  serves=6, tier='budget')

# ---- Menus ----
LEM = ('Homemade lemonade', 'sum-lemonade')
WAT = ('Watermelon and mint cooler', 'sum-watermelon-cooler')
ROSE = ('Rosé and strawberry spritz', 'sum-rose-spritz')
SANG = ('Sangria', 'sum-sangria')

M('greek-summer', 'Greek summer table', 'meat', 4, 'Watermelon and feta, chicken souvlaki pittas, roast peaches with honey.',
  ('sum-watermelon-feta', WAT, 'A crisp Assyrtiko from Greece'),
  ('sum-chicken-souvlaki', LEM, 'A dry rosé', ['sum-cucumber-yoghurt', 'sum-tomato-basil-salad']),
  ('sum-roast-peaches', 'Iced mint tea', 'A sweet Muscat'))
M('steak-night', 'Summer steak night', 'meat', 4, 'Melon and prosciutto, steak with chimichurri, Eton mess.',
  ('sum-melon-prosciutto', WAT, 'A chilled fino sherry'),
  ('sum-steak-chimichurri', 'Sparkling water with lime', 'An Argentinian Malbec', ['sum-potato-salad', 'sum-tomato-basil-salad']),
  ('sum-eton-mess', LEM, ROSE))
M('lamb-salsa-verde-supper', 'Lamb and salsa verde', 'meat', 4, 'Tomato bruschetta, lamb chops with salsa verde, cherry clafoutis.',
  ('sum-tomato-bruschetta', LEM, 'A light Chianti'),
  ('sum-lamb-salsa-verde', WAT, 'A Rioja or Tempranillo', ['sum-potato-salad', 'sum-green-bean-salad']),
  ('sum-cherry-clafoutis', 'Cold milk or a pot of tea', 'A small glass of Kirsch-spiked cherry juice, or a sweet Banyuls'))
M('riviera-fish', 'Riviera fish supper', 'fish', 4, 'Gazpacho, sea bass with tomatoes and olives, watermelon granita.',
  ('sum-gazpacho', LEM, 'A chilled fino sherry'),
  ('sum-sea-bass-tomatoes', WAT, 'A Provence rosé', ['sum-herb-couscous']),
  ('sum-watermelon-granita', 'Sparkling water with mint', ROSE))
M('nicoise-lunch', 'Niçoise lunch', 'fish', 4, 'Smoked salmon with cucumber, tuna niçoise, summer pudding.',
  ('sum-smoked-salmon-cucumber', WAT, 'A Sancerre'),
  ('sum-tuna-nicoise', LEM, 'A Côtes de Provence rosé'),
  ('sum-summer-pudding', 'Single cream and a pot of tea', 'A late-harvest dessert wine'))
M('mussels-and-prawns', 'Mussels and prawns', 'shellfish', 4, 'Chilli lime prawns, mussels in white wine, mango and passion fruit.',
  ('sum-chilli-lime-prawns', WAT, 'An Albariño'),
  ('sum-moules', 'Sparkling water with lemon', 'A Muscadet or Picpoul de Pinet', ['sum-green-bean-salad']),
  ('sum-mango-passion-fruit', LEM, ROSE))
M('garden-party', 'Garden party', 'vegetarian', 6, 'Burrata with peaches, a tomato galette, Victoria sponge.',
  ('sum-burrata-peaches', LEM, 'A Prosecco'),
  ('sum-tomato-galette', WAT, 'A Pinot Grigio', ['sum-green-bean-salad', 'sum-potato-salad']),
  ('sum-victoria-sponge', 'A pot of tea', ROSE))
M('halloumi-summer', 'Halloumi summer', 'vegetarian', 4, 'Courgette fritters, griddled halloumi and peach salad, Eton mess.',
  ('sum-courgette-fritters', WAT, 'A Greek Assyrtiko'),
  ('sum-halloumi-peach-salad', LEM, 'A dry rosé', ['sum-herb-couscous']),
  ('sum-eton-mess', 'Cold milk', ROSE))
M('pasta-al-fresco', 'Pasta al fresco', 'vegetarian', 4, 'Tomato bruschetta, courgette and ricotta pasta, raspberry ripple ice cream.',
  ('sum-tomato-bruschetta', WAT, 'A Vermentino'),
  ('sum-courgette-ricotta-pasta', LEM, 'A Soave'),
  ('sum-no-churn-ice-cream', 'Sparkling water with lemon', SANG))
M('provencal-vegan', 'Provençal supper', 'vegan', 4, 'Gazpacho, ratatouille with sourdough, watermelon granita.',
  ('sum-gazpacho', LEM, 'A chilled fino sherry'),
  ('sum-ratatouille', WAT, 'A Côtes du Rhône', ['sum-green-bean-salad']),
  ('sum-watermelon-granita', 'Sparkling water with mint', ROSE))
M('couscous-vegan', 'Roast pepper feast', 'vegan', 4, 'Tomato bruschetta, roast pepper couscous, mango and passion fruit.',
  ('sum-tomato-bruschetta', WAT, 'A dry rosé'),
  ('sum-pepper-chickpea-couscous', LEM, 'A Grenache from the south of France', ['sum-tomato-basil-salad']),
  ('sum-mango-passion-fruit', 'Iced mint tea', SANG))
M('rice-bowl-vegan', 'Sesame tofu bowls', 'vegan', 4, 'Gazpacho, sesame tofu rice bowls, watermelon granita.',
  ('sum-gazpacho', WAT, 'A dry Riesling'),
  ('sum-tofu-rice-bowl', LEM, 'A cold lager'),
  ('sum-watermelon-granita', 'Jasmine iced tea', ROSE))
