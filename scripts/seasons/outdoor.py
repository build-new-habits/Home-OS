# scripts/seasons/outdoor.py — 27 Nov 2026 v1
# Outdoor cooking: the campfire, the camping stove and the picnic blanket.
# Foil parcels, one pot, one pan, food that travels in a jar or a box.
from build import Book

b = Book('outdoor', 'Outdoor cooking', 'out')
R, M = b.R, b.M

# ---- Starters ----
R('skillet-nachos', 'Campfire skillet nachos', 'starter',
  ['tortilla-chips 200g', 'kidney-beans-tinned 1', 'cheddar-cheese 150g', 'salsa-dip 200g', 'chilli-fresh 1', 'spring-onion 3'],
  ['Put a cast-iron pan on a grill over the fire.',
   'Layer {tortilla-chips}, drained {kidney-beans-tinned} and grated {cheddar-cheese}.',
   'Cover with foil. Heat 5 minutes, until the cheese melts.',
   'Spoon over {salsa-dip}. Scatter sliced {chilli-fresh} and {spring-onion}.'],
  serves=6, tier='budget', note='Use thick oven gloves. The pan handle gets very hot.')

R('scotch-eggs', 'Picnic Scotch eggs', 'starter',
  ['egg-medium 7', 'sausagemeat 400g', 'fresh-sage 4', 'flour-plain 3tbsp', 'breadcrumbs-dried 100g', 'vegetable-oil 2tbsp'],
  ['Boil 6 of {egg-medium} 7 minutes. Cool in cold water. Peel.',
   'Chop {fresh-sage}. Mix into {sausagemeat}. Split into 6.',
   'Flatten each piece. Wrap round an egg. Seal well.',
   'Roll in {flour-plain}, then the last egg beaten, then {breadcrumbs-dried}.',
   'Heat the oven to 200C. Brush with {vegetable-oil}. Bake 25 minutes, until golden and cooked through.',
   'Cool. Pack for the picnic.'],
  serves=6, tier='budget', note='Make at home the day before. They travel well in a cool box.')

R('mackerel-rillettes', 'Smoked mackerel rillettes in a jar', 'starter',
  ['smoked-mackerel 200g', 'creme-fraiche 100ml', 'lemon 1', 'capers 1tbsp', 'chives 10g', 'oatcakes 12'],
  ['Flake {smoked-mackerel}. Throw away the skin.',
   'Mix with {creme-fraiche}, the juice of {lemon} and chopped {capers}.',
   'Snip in {chives}.',
   'Pack into a jar with a lid. Keep cold.',
   'Serve with {oatcakes}.'],
  serves=4, tier='budget')

R('prawn-cocktail-jars', 'Prawn cocktail jars', 'starter',
  ['mayonnaise 4tbsp', 'tomato-ketchup 1tbsp', 'lemon 1', 'prawns-cooked 250g', 'lettuce-iceberg 150g', 'avocado 1', 'paprika 0.25tsp'],
  ['Mix {mayonnaise}, {tomato-ketchup} and the juice of half of {lemon}.',
   'Stir in {prawns-cooked}.',
   'Shred {lettuce-iceberg}. Put in the bottom of 4 jars.',
   'Add diced {avocado}. Spoon the prawns on top.',
   'Dust with {paprika}. Lid on. Keep cold until eating.'],
  serves=4, tier='everyday')

R('bread-on-a-stick', 'Campfire bread on a stick', 'starter',
  ['flour-self-raising 300g', 'baking-powder 1tsp', 'salt 0.5tsp', 'olive-oil 2tbsp', 'jam-strawberry 4tbsp'],
  ['Mix {flour-self-raising}, {baking-powder} and {salt} at home. Pack in a bag.',
   'At camp, add {olive-oil} and about 180 ml water. Knead to a soft dough.',
   'Roll into 8 long snakes. Wind each round the end of a clean green stick.',
   'Hold over hot embers, not flames, 10 minutes, turning, until golden and hollow-sounding.',
   'Slide off. Fill the hole with {jam-strawberry}.'],
  serves=8, tier='budget', note='Embers, not flames: flames burn the outside before the middle cooks.')

R('bean-salad-jars', 'Tomato, olive and bean salad jars', 'starter',
  ['cannellini-beans-tinned 1', 'cherry-tomato 16', 'olives-pitted 60g', 'red-onion 1', 'fresh-basil 10g', 'olive-oil 3tbsp', 'white-wine-vinegar 1tbsp'],
  ['Drain {cannellini-beans-tinned}.',
   'Halve {cherry-tomato}. Chop {red-onion} finely.',
   'Mix with {olives-pitted}, {olive-oil} and {white-wine-vinegar}.',
   'Tear in {fresh-basil}.',
   'Pack into jars. It tastes better after a few hours.'],
  serves=4, tier='budget')

R('roast-chestnuts', 'Fire-roasted chestnuts', 'starter',
  ['chestnuts-cooked 360g', 'olive-oil 1tbsp', 'salt 0.5tsp', 'fresh-rosemary 2'],
  ['Wrap {chestnuts-cooked} in a foil parcel with {olive-oil}, {salt} and {fresh-rosemary}.',
   'Set at the edge of the embers.',
   'Heat 10 minutes, shaking now and then, until hot and smoky.',
   'Open carefully. Eat warm.'],
  serves=4, tier='budget')

R('picnic-pasta-salad', 'Picnic pesto pasta salad', 'starter',
  ['penne-dry 250g', 'pesto 90g', 'cherry-tomato 16', 'mozzarella 1', 'rocket 40g'],
  ['Cook {penne-dry} at home. Rinse under cold water. Drain well.',
   'Stir in {pesto}.',
   'Halve {cherry-tomato}. Tear {mozzarella}.',
   'Mix in. Pack in a box. Add {rocket} on top as you serve.'],
  serves=4, tier='budget', swaps=[('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')])

# ---- Mains ----
R('sausage-bean-pot', 'One-pot sausage and bean stew', 'main',
  ['sausage-pork 8', 'olive-oil 1tbsp', 'onion-medium 1', 'smoked-paprika 2tsp', 'chopped-tomatoes-tinned 1', 'baked-beans 1', 'sourdough 4'],
  ['Put a pot on the camping stove. Add {olive-oil}.',
   'Brown {sausage-pork} 8 minutes, turning.',
   'Add chopped {onion-medium}. Fry 5 minutes.',
   'Add {smoked-paprika}, {chopped-tomatoes-tinned} and {baked-beans}.',
   'Simmer 15 minutes, until the sausages are cooked through.',
   'Serve with {sourdough} toasted over the fire.'],
  serves=4, tier='budget')

R('foil-chicken', 'Foil parcel chicken and potatoes', 'main',
  ['chicken-thigh-boneless 8', 'new-potatoes 16', 'red-onion 1', 'pepper-bell 1', 'olive-oil 3tbsp', 'smoked-paprika 2tsp', 'garlic-clove 3', 'lemon 1'],
  ['Halve {new-potatoes}. Cut {red-onion} and {pepper-bell} into chunks.',
   'Toss everything with {chicken-thigh-boneless}, {olive-oil}, {smoked-paprika} and sliced {garlic-clove}.',
   'Split between 4 double-layered foil squares. Seal tightly.',
   'Cook on a grill over hot embers 35 minutes, turning once.',
   'Open one to check: the chicken should be cooked through and the potatoes soft.',
   'Squeeze over {lemon}.'],
  serves=4, tier='everyday', note='Two layers of foil stop it tearing on the grill.')

R('breakfast-hash', 'Camp stove breakfast hash', 'main',
  ['potato-medium 4', 'olive-oil 2tbsp', 'bacon-rasher-back 6', 'onion-medium 1', 'pepper-bell 1', 'egg-medium 4', 'black-pepper-ground 0.5tsp'],
  ['Dice {potato-medium} small. Boil 6 minutes. Drain.',
   'Fry chopped {bacon-rasher-back} in {olive-oil} in a big pan 4 minutes.',
   'Add the potatoes, chopped {onion-medium} and {pepper-bell}. Fry 12 minutes, until crisp.',
   'Make 4 dips. Crack in {egg-medium}.',
   'Cover. Cook 4 minutes, until the whites set.',
   'Grind over {black-pepper-ground}.'],
  serves=4, tier='budget')

R('campfire-steak-sandwich', 'Campfire steak sandwich', 'main',
  ['beef-sirloin 2', 'olive-oil 1tbsp', 'salt 1tsp', 'onion-medium 1', 'sourdough 8', 'mustard-dijon 2tbsp', 'rocket 40g'],
  ['Rub {beef-sirloin} with {olive-oil} and {salt}.',
   'Cook on a grill over hot embers 3 minutes a side for medium-rare.',
   'Rest 5 minutes. Slice thinly.',
   'Slice {onion-medium}. Fry in the steak pan 8 minutes, until soft.',
   'Toast {sourdough} on the grill. Spread with {mustard-dijon}.',
   'Fill with steak, onions and {rocket}.'],
  serves=4, tier='special')

R('foil-trout', 'Foil-baked trout with lemon and herbs', 'main',
  ['trout-fillet 520g', 'lemon 1', 'fresh-dill 10g', 'butter-unsalted 30g', 'salt 0.5tsp'],
  ['Lay {trout-fillet} on double-layered foil.',
   'Top with slices of {lemon}, {fresh-dill} and small pieces of {butter-unsalted}.',
   'Sprinkle with {salt}. Seal into a parcel.',
   'Cook on a grill over embers 12 minutes, until the fish flakes.'],
  serves=4, tier='everyday')

R('salmon-potato-parcels', 'Salmon and new potato parcels', 'main',
  ['new-potatoes 16', 'salmon-fillet 4', 'spring-onion 4', 'olive-oil 2tbsp', 'lemon 1', 'chives 10g'],
  ['Boil {new-potatoes} at home 10 minutes. Cool. Halve.',
   'Lay the potatoes on 4 double-layered foil squares. Put {salmon-fillet} on top.',
   'Add sliced {spring-onion}, {olive-oil} and slices of {lemon}.',
   'Seal tightly.',
   'Cook over embers 15 minutes, until the salmon flakes.',
   'Snip over {chives}.'],
  serves=4, tier='everyday')

R('prawn-stove-noodles', 'Camp stove king prawn noodles', 'main',
  ['egg-noodles-dry 250g', 'vegetable-oil 2tbsp', 'garlic-clove 2', 'ginger-fresh 1tbsp', 'king-prawns-raw 300g', 'pak-choi 2', 'soy-sauce 3tbsp', 'sweet-chilli-sauce 2tbsp', 'spring-onion 3'],
  ['Cook {egg-noodles-dry} in boiling water for the time on the packet. Drain.',
   'Heat {vegetable-oil} in a big pan. Fry {garlic-clove} and {ginger-fresh} 1 minute.',
   'Add {king-prawns-raw}. Fry 3 minutes, until pink.',
   'Add halved {pak-choi}. Fry 2 minutes.',
   'Add the noodles, {soy-sauce} and {sweet-chilli-sauce}. Toss.',
   'Top with sliced {spring-onion}.'],
  serves=4, tier='everyday')

R('skillet-shakshuka', 'Skillet shakshuka', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'pepper-bell 2', 'garlic-clove 2', 'cumin-ground 1tsp', 'smoked-paprika 1tsp', 'chopped-tomatoes-tinned 2', 'egg-medium 6', 'feta 100g', 'sourdough 4'],
  ['Put a big pan over the fire or stove. Add {olive-oil}.',
   'Fry sliced {onion-medium} and {pepper-bell} 8 minutes.',
   'Add {garlic-clove}, {cumin-ground} and {smoked-paprika}. Fry 1 minute.',
   'Add {chopped-tomatoes-tinned}. Simmer 10 minutes, until thick.',
   'Make 6 dips. Crack in {egg-medium}. Cover. Cook 6 minutes, until the whites set.',
   'Crumble over {feta}. Mop up with {sourdough}.'],
  serves=4, tier='budget')

R('cheesy-foil-potatoes', 'Cheesy foil-packet potatoes', 'main',
  ['potato-medium 6', 'onion-medium 1', 'butter-unsalted 40g', 'garlic-clove 2', 'cheddar-cheese 150g', 'chives 10g'],
  ['Slice {potato-medium} and {onion-medium} thinly.',
   'Split between 4 double-layered foil squares. Dot with {butter-unsalted} and sliced {garlic-clove}.',
   'Seal tightly. Cook on a grill over embers 35 minutes, until soft.',
   'Open. Add grated {cheddar-cheese}. Reseal 3 minutes to melt.',
   'Snip over {chives}.'],
  serves=4, tier='budget')

R('one-pot-pasta', 'One-pot tomato and mozzarella pasta', 'main',
  ['penne-dry 400g', 'chopped-tomatoes-tinned 1', 'garlic-clove 2', 'olive-oil 2tbsp', 'dried-oregano 1tsp', 'mozzarella 1', 'fresh-basil 10g'],
  ['Put {penne-dry}, {chopped-tomatoes-tinned}, sliced {garlic-clove}, {olive-oil} and {dried-oregano} in a pot.',
   'Add 700 ml water. Bring to the boil on the stove.',
   'Simmer 12 minutes, stirring often, until the pasta is cooked and the sauce thick.',
   'Tear in {mozzarella}. Stir until stringy.',
   'Top with {fresh-basil}.'],
  serves=4, tier='budget', note='One pot, so one thing to wash in the stream.')

R('foil-sweet-potatoes', 'Foil-baked sweet potatoes with black beans', 'main',
  ['sweet-potato 4', 'black-beans-tinned 1', 'cumin-ground 1tsp', 'salsa-dip 200g', 'avocado 1', 'lime 1'],
  ['Prick {sweet-potato}. Wrap each in double foil.',
   'Bury in hot embers 45 minutes, turning once, until soft.',
   'Warm drained {black-beans-tinned} with {cumin-ground} in a small pan.',
   'Split the potatoes. Fill with beans and {salsa-dip}.',
   'Top with diced {avocado}. Squeeze over {lime}.'],
  serves=4, tier='budget')

R('coconut-dal', 'Camp stove coconut dal', 'main',
  ['vegetable-oil 1tbsp', 'onion-medium 1', 'garlic-clove 2', 'curry-powder 2tbsp', 'lentils-red-dry 250g', 'coconut-milk-tinned 1', 'stock-cube 1', 'spinach 100g', 'naan-bread 4'],
  ['Fry chopped {onion-medium} in {vegetable-oil} 6 minutes.',
   'Add {garlic-clove} and {curry-powder}. Fry 1 minute.',
   'Add {lentils-red-dry}, {coconut-milk-tinned}, {stock-cube} and 600 ml water.',
   'Simmer 20 minutes, stirring, until thick.',
   'Stir in {spinach}.',
   'Warm {naan-bread} over the fire.'],
  serves=4, tier='budget', note='Check the stock cube and naan say vegan if you need them to be.', drop=('vegan',))

R('mushroom-bean-stew', 'Campfire mushroom and bean stew', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'mushroom-chestnut 16', 'garlic-clove 2', 'smoked-paprika 2tsp', 'butter-beans-tinned 2', 'chopped-tomatoes-tinned 1', 'fresh-thyme 4', 'sourdough 4'],
  ['Fry chopped {onion-medium} in {olive-oil} in a pot 6 minutes.',
   'Add sliced {mushroom-chestnut}. Fry 6 minutes, until browned.',
   'Add {garlic-clove} and {smoked-paprika}. Fry 1 minute.',
   'Add drained {butter-beans-tinned}, {chopped-tomatoes-tinned} and {fresh-thyme}.',
   'Simmer 15 minutes.',
   'Serve with {sourdough} toasted on the fire.'],
  serves=4, tier='budget')

# ---- Sides ----
R('foil-new-potatoes', 'Garlic foil-roast new potatoes', 'side',
  ['new-potatoes 20', 'olive-oil 2tbsp', 'garlic-clove 4', 'fresh-rosemary 2', 'salt 0.5tsp'],
  ['Halve {new-potatoes}.',
   'Toss with {olive-oil}, whole {garlic-clove}, {fresh-rosemary} and {salt}.',
   'Seal in a double foil parcel.',
   'Cook over embers 30 minutes, shaking now and then, until soft.'],
  serves=4, tier='budget')

R('foil-corn', 'Foil-roast corn with herb butter', 'side',
  ['corn-on-the-cob 4', 'butter-unsalted 40g', 'fresh-parsley 10g', 'garlic-clove 1'],
  ['Mash {butter-unsalted} with chopped {fresh-parsley} and crushed {garlic-clove}.',
   'Spread over {corn-on-the-cob}.',
   'Wrap each in foil.',
   'Cook over embers 20 minutes, turning, until tender.'],
  serves=4, tier='budget')

R('fire-peppers', 'Fire-roasted peppers', 'side',
  ['pepper-bell 4', 'olive-oil 2tbsp', 'garlic-clove 1', 'white-wine-vinegar 1tsp'],
  ['Put {pepper-bell} whole on the grill over hot embers.',
   'Turn every few minutes for 15 minutes, until blackened.',
   'Put in a bag to steam 10 minutes. Peel off the skins.',
   'Slice. Dress with {olive-oil}, crushed {garlic-clove} and {white-wine-vinegar}.'],
  serves=4, tier='budget')

R('picnic-slaw', 'Crunchy picnic slaw', 'side',
  ['red-cabbage 200g', 'carrot-medium 2', 'apple-medium 1', 'lemon 1', 'olive-oil 2tbsp', 'sunflower-seeds 2tbsp'],
  ['Shred {red-cabbage}. Grate {carrot-medium} and {apple-medium}.',
   'Toss with the juice of {lemon} and {olive-oil}.',
   'Pack in a box. Scatter {sunflower-seeds} on top as you serve.'],
  serves=6, tier='budget')

# ---- Puddings ----
R('smores', "S'mores", 'pudding',
  ['digestive-biscuit 16', 'marshmallows 8', 'milk-chocolate-bar 2'],
  ['Push {marshmallows} onto long sticks.',
   'Toast over hot embers 1 minute, turning, until golden and puffed.',
   'Put a square of {milk-chocolate-bar} on one of {digestive-biscuit}.',
   'Slide the hot marshmallow on top. Press with a second biscuit.'],
  serves=8, tier='budget', note='Most marshmallows have gelatine in them, so these are not vegetarian.')

R('foil-baked-apples', 'Campfire baked apples', 'pudding',
  ['apple-medium 4', 'sultanas 40g', 'sugar-soft-brown 2tbsp', 'cinnamon-ground 1tsp', 'dairy-free-spread 30g'],
  ['Core {apple-medium}.',
   'Mix {sultanas}, {sugar-soft-brown} and {cinnamon-ground}. Stuff into the apples.',
   'Top each with a little {dairy-free-spread}.',
   'Wrap in double foil. Set in the embers 25 minutes, until soft.'],
  serves=4, tier='budget')

R('chocolate-orange-cakes', 'Campfire chocolate orange cakes', 'pudding',
  ['orange 6', 'flour-self-raising 100g', 'sugar-caster 100g', 'cocoa-powder 25g', 'butter-unsalted 100g', 'egg-medium 2'],
  ['Cut the tops off {orange}. Scoop out the flesh, leaving the shells whole.',
   'Beat {butter-unsalted}, {sugar-caster} and {egg-medium} at home. Fold in {flour-self-raising} and {cocoa-powder}. Pack in a tub.',
   'Fill each orange shell half full. Put the tops back on.',
   'Wrap each in double foil.',
   'Set in the embers 20 minutes, until the cake is risen and springy.'],
  serves=6, tier='budget', note='Eat the orange flesh at breakfast.')

R('camp-pancakes', 'Camp stove pancakes with berries', 'pudding',
  ['flour-self-raising 200g', 'sugar-caster 1tbsp', 'egg-medium 1', 'milk-whole 250ml', 'butter-unsalted 20g', 'blueberries 150g', 'maple-syrup 4tbsp'],
  ['Mix {flour-self-raising} and {sugar-caster} at home. Pack in a bottle with a wide neck.',
   'At camp, add {egg-medium} and {milk-whole}. Shake hard until smooth.',
   'Melt a little {butter-unsalted} in a pan.',
   'Pour in small rounds. Scatter with {blueberries}. Cook 2 minutes, until bubbles show.',
   'Flip. Cook 1 minute more.',
   'Drizzle with {maple-syrup}.'],
  serves=4, tier='budget')

R('fruit-kebabs', 'Maple grilled fruit kebabs', 'pudding',
  ['pineapple 1', 'banana-medium 2', 'strawberries 200g', 'maple-syrup 3tbsp', 'lime 1'],
  ['Cut half of {pineapple} and {banana-medium} into chunks. Hull {strawberries}.',
   'Thread onto skewers.',
   'Brush with {maple-syrup}.',
   'Grill over embers 4 minutes, turning, until caramelised.',
   'Squeeze over {lime}.'],
  serves=4, tier='budget')

R('chocolate-fondue', 'Campfire chocolate fondue', 'pudding',
  ['dark-chocolate-70 200g', 'coconut-milk-tinned 1', 'strawberries 200g', 'banana-medium 2', 'apple-medium 2'],
  ['Put {dark-chocolate-70} and half of {coconut-milk-tinned} in a small pan.',
   'Warm at the edge of the fire, stirring, until smooth.',
   'Cut {banana-medium} and {apple-medium} into chunks.',
   'Dip the fruit and {strawberries} on sticks.'],
  serves=6, tier='everyday')

R('skillet-cookie', 'Giant skillet cookie', 'pudding',
  ['butter-unsalted 100g', 'sugar-soft-brown 100g', 'egg-medium 1', 'flour-plain 150g', 'bicarbonate-of-soda 0.5tsp', 'milk-chocolate-bar 2'],
  ['Beat {butter-unsalted}, {sugar-soft-brown} and {egg-medium} at home. Stir in {flour-plain} and {bicarbonate-of-soda}.',
   'Chop {milk-chocolate-bar}. Stir in. Pack in a tub.',
   'At camp, press into a cast-iron pan.',
   'Cover with foil. Set on a grill over low embers 20 minutes, until set at the edges.',
   'Eat warm from the pan with spoons.'],
  serves=6, tier='budget')

# ---- Drinks ----
R('cowboy-coffee', 'Cowboy coffee', 'drink',
  ['water 1000ml', 'coffee-ground 6tbsp', 'sugar-soft-brown 2tbsp'],
  ['Bring {water} to the boil in a pot over the fire.',
   'Take off the heat. Stir in {coffee-ground}.',
   'Leave 4 minutes.',
   'Splash in a little cold water to sink the grounds. Pour carefully. Sweeten with {sugar-soft-brown}.'],
  serves=6, tier='budget')

R('ginger-lime-cooler', 'Honey, ginger and lime cooler', 'drink',
  ['ginger-fresh 2tbsp', 'honey 3tbsp', 'lime 3', 'water 1000ml'],
  ['Grate {ginger-fresh} at home. Stir with {honey} and the juice of {lime}.',
   'Pour into a bottle with {water}.',
   'Chill in a cool box or a stream.',
   'Shake before pouring.'],
  serves=6, tier='budget')

R('hot-buttered-rum', 'Flask hot buttered rum', 'drink',
  ['butter-unsalted 40g', 'sugar-soft-brown 3tbsp', 'cinnamon-ground 0.5tsp', 'nutmeg 0.25tsp', 'spirit-40 160ml', 'water 600ml'],
  ['Beat {butter-unsalted}, {sugar-soft-brown}, {cinnamon-ground} and {nutmeg} at home. Pack in a small tub.',
   'Heat {water} to steaming over the stove.',
   'Stir in the spiced butter until melted.',
   'Add {spirit-40}. Pour into a flask.'],
  serves=4, tier='everyday', note='The spirit is dark rum.')

R('camp-shandy', 'Lemon shandy', 'drink',
  ['beer-lager 2', 'lemonade 2', 'lemon 1'],
  ['Chill {beer-lager} and {lemonade} in a cool box or a stream.',
   'Pour half and half into cups.',
   'Add a squeeze of {lemon}.'],
  serves=4, tier='budget')

# ---- Menus ----
COF = ('Cowboy coffee', 'out-cowboy-coffee')
GIN = ('Honey, ginger and lime cooler', 'out-ginger-lime-cooler')
RUM = ('Flask hot buttered rum', 'out-hot-buttered-rum')
SHA = ('Lemon shandy', 'out-camp-shandy')

M('campfire-sausages', 'Campfire supper', 'meat', 4, 'Bread on a stick, a one-pot sausage and bean stew, s\'mores.',
  ('out-bread-on-a-stick', GIN, SHA),
  ('out-sausage-bean-pot', 'Hot chocolate from a flask', 'A cold lager', ['out-foil-corn']),
  ('out-smores', COF, RUM))
M('foil-chicken-night', 'Foil parcel night', 'meat', 4, 'Fire-roasted chestnuts, foil parcel chicken, campfire baked apples.',
  ('out-roast-chestnuts', GIN, 'A glass of red from a flask cup'),
  ('out-foil-chicken', 'Sparkling water with lime', 'A fruity Grenache', ['out-fire-peppers']),
  ('out-foil-baked-apples', COF, RUM))
M('steak-fire', 'Steak over the fire', 'meat', 4, 'Skillet nachos, campfire steak sandwiches, chocolate orange cakes.',
  ('out-skillet-nachos', GIN, SHA),
  ('out-campfire-steak-sandwich', 'Cloudy apple juice', 'A Malbec', ['out-foil-new-potatoes']),
  ('out-chocolate-orange-cakes', COF, RUM))
M('picnic-day', 'Picnic day', 'meat', 4, 'Scotch eggs, a breakfast hash for brunch, pancakes with berries.',
  ('out-scotch-eggs', GIN, SHA),
  ('out-breakfast-hash', COF, 'A Bloody Mary-style spiced tomato juice with vodka, or a cold lager'),
  ('out-camp-pancakes', 'Cold milk', RUM))
M('trout-camp', 'Riverside trout', 'fish', 4, 'Mackerel rillettes, foil-baked trout, maple fruit kebabs.',
  ('out-mackerel-rillettes', GIN, 'A chilled Sauvignon Blanc'),
  ('out-foil-trout', 'Sparkling elderflower', 'An unoaked Chardonnay', ['out-foil-new-potatoes', 'out-picnic-slaw']),
  ('out-fruit-kebabs', COF, RUM))
M('salmon-camp', 'Salmon parcels', 'fish', 4, 'Bean salad jars, salmon and new potato parcels, chocolate fondue.',
  ('out-bean-salad-jars', GIN, 'A dry rosé'),
  ('out-salmon-potato-parcels', 'Cloudy lemonade', 'A Picpoul de Pinet', ['out-fire-peppers']),
  ('out-chocolate-fondue', COF, RUM))
M('prawn-camp', 'Camp stove prawns', 'shellfish', 4, 'Prawn cocktail jars, king prawn noodles, maple fruit kebabs.',
  ('out-prawn-cocktail-jars', GIN, SHA),
  ('out-prawn-stove-noodles', 'Jasmine iced tea from a flask', 'An off-dry Riesling'),
  ('out-fruit-kebabs', COF, RUM))
M('shakshuka-camp', 'Skillet brunch', 'vegetarian', 4, 'Picnic pesto pasta, skillet shakshuka, camp stove pancakes.',
  ('out-picnic-pasta-salad', GIN, SHA),
  ('out-skillet-shakshuka', COF, 'A Bloody Mary-style spiced tomato juice with vodka'),
  ('out-camp-pancakes', 'Cold milk', RUM))
M('cheesy-potato-camp', 'Cheesy potatoes', 'vegetarian', 4, 'Skillet nachos, cheesy foil-packet potatoes, giant skillet cookie.',
  ('out-skillet-nachos', GIN, SHA),
  ('out-cheesy-foil-potatoes', 'Cloudy apple juice', 'A Beaujolais', ['out-fire-peppers', 'out-foil-corn']),
  ('out-skillet-cookie', COF, RUM))
M('one-pot-camp', 'One-pot pasta night', 'vegetarian', 4, 'Bread on a stick, one-pot tomato and mozzarella pasta, chocolate orange cakes.',
  ('out-bread-on-a-stick', GIN, SHA),
  ('out-one-pot-pasta', 'Sparkling water with lemon', 'A Chianti', ['out-picnic-slaw']),
  ('out-chocolate-orange-cakes', COF, RUM))
M('sweet-potato-vegan', 'Ember-baked sweet potatoes', 'vegan', 4, 'Fire-roasted chestnuts, foil-baked sweet potatoes with black beans, chocolate fondue.',
  ('out-roast-chestnuts', GIN, SHA),
  ('out-foil-sweet-potatoes', 'Sparkling water with lime', 'A fruity Grenache', ['out-fire-peppers']),
  ('out-chocolate-fondue', COF, RUM))
M('mushroom-stew-vegan', 'Campfire stew', 'vegan', 4, 'Tomato, olive and bean salad jars, mushroom and bean stew, campfire baked apples.',
  ('out-bean-salad-jars', GIN, 'A dry rosé'),
  ('out-mushroom-bean-stew', 'Cloudy apple juice', 'A Côtes du Rhône', ['out-foil-new-potatoes']),
  ('out-foil-baked-apples', COF, RUM))
M('fruit-camp-vegan', 'Bread and fire', 'vegan', 4, 'Bread on a stick, mushroom and bean stew, maple fruit kebabs.',
  ('out-bread-on-a-stick', GIN, SHA),
  ('out-mushroom-bean-stew', 'Hot spiced apple juice from a flask', 'A dark lager', ['out-fire-peppers']),
  ('out-fruit-kebabs', COF, RUM))
