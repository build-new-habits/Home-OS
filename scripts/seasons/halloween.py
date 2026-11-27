# scripts/seasons/halloween.py — 27 Nov 2026 v1
# Halloween and Bonfire Night: pumpkin, toffee apples, food with a spooky
# name that children will eat, and warming bowls for cold nights outside.
from build import Book

b = Book('halloween', 'Halloween', 'hal')
R, M = b.R, b.M

# ---- Starters ----
R('pumpkin-soup', 'Spiced pumpkin soup', 'starter',
  ['olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'ginger-fresh 1tsp', 'cumin-ground 1tsp', 'pumpkin 900g', 'stock-vegetable 1000ml', 'coconut-milk-tinned 1', 'pumpkin-seeds 2tbsp'],
  ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.',
   'Add {garlic-clove}, {ginger-fresh} and {cumin-ground}. Fry 1 minute.',
   'Dice {pumpkin}. Add with {stock-vegetable}. Simmer 20 minutes, until soft.',
   'Add {coconut-milk-tinned}. Blend until smooth.',
   'Toast {pumpkin-seeds} in a dry pan. Scatter on top.'],
  serves=6, tier='budget', note='Use the flesh you scoop out when you carve the lantern.')

R('mummy-sausages', 'Mummy sausages', 'starter',
  ['puff-pastry 320g', 'chipolatas 16', 'egg-medium 1', 'tomato-ketchup 4tbsp'],
  ['Heat the oven to 200C. Cut {puff-pastry} into thin strips.',
   'Wrap the strips round {chipolatas} like bandages. Leave a gap near one end for the face.',
   'Brush with beaten {egg-medium}.',
   'Bake 20 minutes, until golden and the sausages are cooked.',
   'Dot two eyes of {tomato-ketchup} in each gap. Serve the rest for dipping.'],
  serves=8, tier='budget')

R('bat-wings', 'Sticky black bat wings', 'starter',
  ['chicken-wings 12', 'soy-sauce 4tbsp', 'honey 3tbsp', 'five-spice 1tsp', 'garlic-clove 2', 'sesame-seeds 1tbsp'],
  ['Heat the oven to 200C.',
   'Mix {soy-sauce}, {honey}, {five-spice} and crushed {garlic-clove}.',
   'Toss {chicken-wings} in half the sauce. Lay on a lined tray.',
   'Roast 35 minutes, brushing with the rest of the sauce halfway, until dark and sticky.',
   'Scatter with {sesame-seeds}.'],
  serves=6, tier='budget')

R('graveyard-guacamole', 'Graveyard guacamole with tortilla tombstones', 'starter',
  ['avocado 3', 'lime 2', 'red-onion 1', 'chilli-fresh 1', 'fresh-coriander 10g', 'tortilla-chips 150g', 'black-beans-tinned 1'],
  ['Mash {avocado} with the juice of {lime}.',
   'Chop {red-onion}, {chilli-fresh} and {fresh-coriander} finely. Stir in.',
   'Spread in a shallow dish. Scatter drained {black-beans-tinned} over like earth.',
   'Stand {tortilla-chips} upright in it like tombstones.'],
  serves=6, tier='budget')

R('fish-bones', 'Crispy fish bones', 'starter',
  ['cod-fillet 2', 'flour-plain 3tbsp', 'egg-medium 1', 'panko 60g', 'smoked-paprika 1tsp', 'vegetable-oil 2tbsp', 'tartare-sauce 60g'],
  ['Heat the oven to 220C. Cut {cod-fillet} into thin strips like bones.',
   'Roll in {flour-plain}. Dip in beaten {egg-medium}.',
   'Mix {panko} with {smoked-paprika}. Press onto the fish.',
   'Lay on a tray. Drizzle with {vegetable-oil}.',
   'Bake 12 minutes, until golden. Serve with {tartare-sauce}.'],
  serves=4, tier='everyday')

R('devils-prawns', "Devil's prawns", 'starter',
  ['butter-unsalted 40g', 'garlic-clove 2', 'cayenne-pepper 0.5tsp', 'smoked-paprika 1tsp', 'king-prawns-raw 300g', 'lemon 1', 'sourdough 4'],
  ['Melt {butter-unsalted} in a frying pan.',
   'Add crushed {garlic-clove}, {cayenne-pepper} and {smoked-paprika}. Fry 30 seconds.',
   'Add {king-prawns-raw}. Cook 3 minutes, until pink.',
   'Squeeze over {lemon}.',
   'Serve on toasted {sourdough} with the red butter poured over.'],
  serves=4, tier='special')

R('halloumi-fries', 'Halloumi fries with blood-red dip', 'starter',
  ['halloumi 2', 'flour-plain 3tbsp', 'smoked-paprika 1tsp', 'vegetable-oil 4tbsp', 'tomato-ketchup 4tbsp', 'sriracha-mayo 30g'],
  ['Cut {halloumi} into thick fingers.',
   'Toss in {flour-plain} mixed with {smoked-paprika}.',
   'Fry in {vegetable-oil} 2 minutes each side, until golden.',
   'Drain on kitchen paper.',
   'Swirl {tomato-ketchup} with {sriracha-mayo} for dipping.'],
  serves=4, tier='everyday')

R('beetroot-blood-hummus', 'Blood-red beetroot hummus', 'starter',
  ['beetroot 2', 'chickpeas-tinned 1', 'tahini 2tbsp', 'lemon 1', 'garlic-clove 1', 'olive-oil 3tbsp', 'pitta-bread 4'],
  ['Chop cooked {beetroot}. Drain {chickpeas-tinned}.',
   'Blend with {tahini}, the juice of {lemon}, {garlic-clove} and {olive-oil} until smooth and deep red.',
   'Cut {pitta-bread} into bat shapes or strips. Toast until crisp.',
   'Serve for dipping.'],
  serves=6, tier='budget')

# ---- Mains ----
R('cauldron-chilli', "Witch's cauldron chilli", 'main',
  ['olive-oil 1tbsp', 'onion-medium 1', 'garlic-clove 2', 'beef-mince-5-fat 500g', 'chilli-powder 2tsp', 'cumin-ground 1tsp', 'chopped-tomatoes-tinned 2', 'kidney-beans-tinned 1', 'dark-chocolate-70 20g', 'rice-basmati-dry 300g'],
  ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.',
   'Add {garlic-clove} and {beef-mince-5-fat}. Fry 8 minutes, breaking it up, until browned.',
   'Add {chilli-powder} and {cumin-ground}. Fry 1 minute.',
   'Add {chopped-tomatoes-tinned} and drained {kidney-beans-tinned}. Simmer 30 minutes.',
   'Stir in {dark-chocolate-70} until melted. || A little chocolate deepens the colour and the flavour.',
   'Cook {rice-basmati-dry}. Serve the chilli bubbling in the pot.'],
  serves=6, tier='budget')

R('bonfire-hot-dogs', 'Bonfire night hot dogs', 'main',
  ['hot-dog-sausage 8', 'olive-oil 1tbsp', 'onion-large 2', 'sugar-soft-brown 1tsp', 'bread-roll-white 8', 'mustard-dijon 2tbsp', 'tomato-ketchup 4tbsp'],
  ['Slice {onion-large}. Fry slowly in {olive-oil} 20 minutes, until soft and golden.',
   'Add {sugar-soft-brown}. Cook 2 minutes more, until sticky.',
   'Heat {hot-dog-sausage} in simmering water 5 minutes.',
   'Split {bread-roll-white}.',
   'Fill with a sausage, the onions, {mustard-dijon} and {tomato-ketchup}.'],
  serves=4, tier='budget', note='Wrap in foil to carry outside to the bonfire.')

R('pumpkin-chicken-traybake', 'Chicken, pumpkin and sage traybake', 'main',
  ['chicken-thigh-boneless 8', 'pumpkin 700g', 'red-onion 2', 'garlic-clove 4', 'fresh-sage 8', 'olive-oil 3tbsp', 'chilli-flakes 0.5tsp', 'maple-syrup 1tbsp'],
  ['Heat the oven to 200C.',
   'Dice {pumpkin}. Cut {red-onion} into wedges.',
   'Toss in a tin with {chicken-thigh-boneless}, whole {garlic-clove}, {fresh-sage}, {olive-oil} and {chilli-flakes}.',
   'Roast 35 minutes, until the chicken is golden and cooked through.',
   'Drizzle with {maple-syrup}. Roast 5 minutes more.'],
  serves=4, tier='everyday')

R('blackened-salmon', 'Blackened salmon with pumpkin mash', 'main',
  ['pumpkin 600g', 'potato-medium 2', 'butter-unsalted 30g', 'smoked-paprika 2tsp', 'garlic-powder 1tsp', 'dried-thyme 1tsp', 'cayenne-pepper 0.25tsp', 'salmon-fillet 4', 'olive-oil 1tbsp'],
  ['Dice {pumpkin} and {potato-medium}. Boil 15 minutes, until soft. Mash with {butter-unsalted}.',
   'Mix {smoked-paprika}, {garlic-powder}, {dried-thyme} and {cayenne-pepper}.',
   'Rub the spices over {salmon-fillet}.',
   'Fry in {olive-oil} on a high heat 4 minutes skin side down. Turn. Cook 3 minutes.',
   'Serve on the orange mash.'],
  serves=4, tier='everyday', note='The spices char dark. That is the blackening, not burning.')

R('kedgeree', 'Smoked haddock kedgeree', 'main',
  ['rice-basmati-dry 300g', 'haddock-smoked 400g', 'milk-whole 300ml', 'egg-medium 4', 'butter-unsalted 30g', 'onion-medium 1', 'curry-powder 2tsp', 'fresh-parsley 15g', 'lemon 1'],
  ['Cook {rice-basmati-dry} for the time on the packet.',
   'Simmer {haddock-smoked} in {milk-whole} 6 minutes. Flake. Throw away the skin.',
   'Boil {egg-medium} 8 minutes. Cool. Peel and quarter.',
   'Fry chopped {onion-medium} in {butter-unsalted} 8 minutes. Add {curry-powder}. Fry 1 minute.',
   'Stir in the rice and fish until hot.',
   'Top with the eggs, chopped {fresh-parsley} and {lemon} wedges.'],
  serves=4, tier='everyday')

R('prawn-gumbo', 'Spooky swamp prawn gumbo', 'main',
  ['olive-oil 2tbsp', 'flour-plain 2tbsp', 'onion-medium 1', 'pepper-bell 1', 'celery-stick 2', 'garlic-clove 2', 'smoked-paprika 2tsp', 'chopped-tomatoes-tinned 1', 'stock-vegetable 600ml', 'king-prawns-raw 400g', 'rice-white-cooked 2'],
  ['Stir {flour-plain} into {olive-oil} in a large pan on a low heat. Cook 5 minutes, until nut brown.',
   'Chop {onion-medium}, {pepper-bell} and {celery-stick}. Add with {garlic-clove}. Fry 8 minutes.',
   'Add {smoked-paprika}, {chopped-tomatoes-tinned} and {stock-vegetable}. Simmer 20 minutes.',
   'Add {king-prawns-raw}. Cook 4 minutes, until pink.',
   'Serve over warm {rice-white-cooked}.'],
  serves=4, tier='everyday', note='The browned flour is the base of a gumbo. Stir it all the time.')

R('spooky-spaghetti', 'Spooky spaghetti with mozzarella eyeballs', 'main',
  ['spaghetti-dry 400g', 'olive-oil 2tbsp', 'garlic-clove 2', 'passata 700g', 'dried-oregano 1tsp', 'mozzarella 1', 'olives-pitted 30g', 'fresh-basil 5g'],
  ['Cook {spaghetti-dry} for the time on the packet.',
   'Fry sliced {garlic-clove} in {olive-oil} 1 minute.',
   'Add {passata} and {dried-oregano}. Simmer 10 minutes.',
   'Toss the drained spaghetti in the blood-red sauce.',
   'Tear {mozzarella} into balls. Press a slice from {olives-pitted} into each for an eye.',
   'Sit the eyeballs on top. Add {fresh-basil}.'],
  serves=4, tier='budget')

R('bonfire-jackets', 'Bonfire jacket potatoes with cheese and beans', 'main',
  ['potato-large 4', 'olive-oil 1tbsp', 'salt 1tsp', 'baked-beans 1', 'cheddar-cheese 150g', 'butter-unsalted 20g'],
  ['Heat the oven to 200C. Prick {potato-large} all over with a fork.',
   'Rub with {olive-oil} and {salt}.',
   'Bake 1 hour 15 minutes, until crisp outside and soft inside.',
   'Warm {baked-beans} in a pan.',
   'Split the potatoes. Add {butter-unsalted}, the beans and grated {cheddar-cheese}.'],
  serves=4, tier='budget', note='The salt and oil make the skins crackle.')

R('stuffed-squash', 'Baked squash halves with feta and lentils', 'main',
  ['butternut-squash 2', 'olive-oil 3tbsp', 'lentils-tinned 1', 'spinach 100g', 'feta 150g', 'pumpkin-seeds 2tbsp', 'fresh-sage 6'],
  ['Heat the oven to 200C. Halve {butternut-squash} lengthways. Scoop out the seeds.',
   'Brush with 2 tbsp of {olive-oil}. Roast cut side up 45 minutes, until soft.',
   'Warm drained {lentils-tinned} with {spinach} until wilted.',
   'Spoon into the squash. Crumble over {feta}.',
   'Fry {fresh-sage} in the rest of the oil until crisp.',
   'Roast 10 minutes more. Top with the sage and {pumpkin-seeds}.'],
  serves=4, tier='everyday')

R('vegan-pumpkin-risotto', 'Roast pumpkin and sage risotto', 'main',
  ['pumpkin 600g', 'olive-oil 4tbsp', 'stock-vegetable 1200ml', 'onion-medium 1', 'rice-arborio-dry 300g', 'wine-white 125ml', 'nutritional-yeast 3tbsp', 'fresh-sage 8'],
  ['Heat the oven to 200C. Dice {pumpkin}. Roast with 2 tbsp of {olive-oil} 30 minutes.',
   'Warm {stock-vegetable}. Fry chopped {onion-medium} in 1 tbsp of oil 8 minutes.',
   'Add {rice-arborio-dry}. Stir 1 minute. Add {wine-white}.',
   'Add the stock a ladle at a time, stirring, about 18 minutes.',
   'Stir in half the pumpkin, mashed, and {nutritional-yeast}. Fold in the rest.',
   'Fry {fresh-sage} in the last of the oil until crisp. Scatter on top.'],
  serves=4, tier='everyday')

R('vegan-hot-dogs', 'Plant sausage hot dogs with sticky onions', 'main',
  ['plant-sausages 8', 'olive-oil 2tbsp', 'onion-large 2', 'sugar-soft-brown 1tsp', 'pitta-bread 4', 'mustard-dijon 2tbsp', 'tomato-ketchup 4tbsp'],
  ['Slice {onion-large}. Fry slowly in 1 tbsp of {olive-oil} 20 minutes, until golden.',
   'Add {sugar-soft-brown}. Cook 2 minutes more.',
   'Fry {plant-sausages} in the rest of the oil 10 minutes, turning, until browned.',
   'Warm {pitta-bread}. Open into pockets.',
   'Fill with sausages, onions, {mustard-dijon} and {tomato-ketchup}.'],
  serves=4, tier='budget', note='Check the sausage packet says vegan; some contain egg.')

R('lentil-cauldron-stew', 'Red lentil cauldron stew', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'carrot-medium 2', 'garlic-clove 2', 'smoked-paprika 2tsp', 'cumin-ground 1tsp', 'lentils-red-dry 250g', 'chopped-tomatoes-tinned 1', 'stock-vegetable 1000ml', 'kale 100g', 'sourdough 4'],
  ['Fry chopped {onion-medium} and {carrot-medium} in {olive-oil} 8 minutes.',
   'Add {garlic-clove}, {smoked-paprika} and {cumin-ground}. Fry 1 minute.',
   'Add {lentils-red-dry}, {chopped-tomatoes-tinned} and {stock-vegetable}.',
   'Simmer 25 minutes, until the lentils collapse.',
   'Stir in {kale}. Cook 4 minutes.',
   'Serve with {sourdough}.'],
  serves=6, tier='budget')

# ---- Sides ----
R('roast-pumpkin-seeds', 'Crunchy roast pumpkin seeds', 'side',
  ['pumpkin-seeds 100g', 'olive-oil 1tbsp', 'smoked-paprika 1tsp', 'salt 0.5tsp'],
  ['Heat the oven to 180C.',
   'Toss {pumpkin-seeds} with {olive-oil}, {smoked-paprika} and {salt}.',
   'Spread on a tray. Roast 10 minutes, until they pop and turn golden.'],
  serves=6, tier='budget', note='Seeds scooped from a carving pumpkin work too: rinse, dry, then roast 20 minutes.')

R('chilli-corn', 'Corn on the cob with chilli butter', 'side',
  ['corn-on-the-cob 4', 'butter-unsalted 40g', 'chilli-flakes 0.5tsp', 'lime 1'],
  ['Boil {corn-on-the-cob} 8 minutes, until tender.',
   'Mash {butter-unsalted} with {chilli-flakes} and the zest of {lime}.',
   'Roll the hot corn in the butter.'],
  serves=4, tier='budget')

R('blood-slaw', 'Beetroot blood slaw', 'side',
  ['beetroot-raw 2', 'red-cabbage 200g', 'apple-medium 1', 'white-wine-vinegar 1tbsp', 'olive-oil 2tbsp'],
  ['Peel {beetroot-raw}. Grate coarsely. || Wear gloves; it stains.',
   'Shred {red-cabbage}. Grate {apple-medium}.',
   'Toss with {white-wine-vinegar} and {olive-oil}.'],
  serves=6, tier='budget')

R('colcannon', 'Colcannon', 'side',
  ['potato-large 4', 'cabbage-white 1', 'spring-onion 4', 'butter-unsalted 60g', 'milk-whole 150ml'],
  ['Peel and chop {potato-large}. Boil 20 minutes, until soft.',
   'Shred a quarter of {cabbage-white}. Boil 5 minutes. Drain.',
   'Warm {milk-whole} with sliced {spring-onion}.',
   'Mash the potatoes with the milk and half of {butter-unsalted}. Stir in the cabbage.',
   'Make a well in the top. Add the rest of the butter to melt.'],
  serves=6, tier='budget', note='An Irish Halloween dish. A coin was once hidden in it for luck.')

# ---- Puddings ----
R('toffee-apples', 'Toffee apples', 'pudding',
  ['apple-medium 8', 'sugar-caster 400g', 'water 100ml', 'white-wine-vinegar 1tsp', 'golden-syrup 2tbsp'],
  ['Push a wooden stick into each of {apple-medium}. Line a tray with baking paper.',
   'Heat {sugar-caster}, {water}, {white-wine-vinegar} and {golden-syrup} until the sugar dissolves.',
   'Boil without stirring 10 minutes, until a drop snaps in cold water.',
   'Dip each apple, twisting to coat. || The toffee is very hot. Keep children well back.',
   'Stand on the tray to set.'],
  serves=8, tier='budget')

R('pumpkin-pie', 'Pumpkin pie', 'pudding',
  ['shortcrust-pastry 320g', 'pumpkin 600g', 'sugar-soft-brown 150g', 'egg-medium 3', 'double-cream 150ml', 'cinnamon-ground 2tsp', 'ginger-ground 1tsp', 'nutmeg 0.5tsp'],
  ['Steam diced {pumpkin} 15 minutes, until soft. Blend until smooth. Cool.',
   'Heat the oven to 190C. Line a 23 cm tin with {shortcrust-pastry}. Bake 15 minutes with baking beans.',
   'Whisk the pumpkin with {sugar-soft-brown}, {egg-medium} and {double-cream}.',
   'Add {cinnamon-ground}, {ginger-ground} and {nutmeg}.',
   'Pour into the case. Lower the oven to 170C.',
   'Bake 45 minutes, until set with a slight wobble. Cool.'],
  serves=8, tier='everyday')

R('graveyard-pots', 'Chocolate graveyard pots', 'pudding',
  ['dark-chocolate 150g', 'double-cream 300ml', 'sugar-caster 2tbsp', 'chocolate-digestive 8', 'shortbread 6'],
  ['Melt {dark-chocolate}. Cool a little.',
   'Whip {double-cream} with {sugar-caster} to soft peaks. Fold in the chocolate.',
   'Spoon into 6 small glasses.',
   'Crush {chocolate-digestive} to crumbs. Scatter on top like earth.',
   'Stand a piece of {shortbread} in each, like a gravestone. Chill 1 hour.'],
  serves=6, tier='budget')

R('barmbrack', 'Barmbrack tea loaf', 'pudding',
  ['tea-bags 2', 'sultanas 200g', 'raisins 150g', 'mixed-peel 50g', 'sugar-soft-brown 150g', 'egg-medium 1', 'flour-self-raising 250g', 'mixed-spice 1tsp'],
  ['Pour 300 ml strong hot tea from {tea-bags} over {sultanas}, {raisins}, {mixed-peel} and {sugar-soft-brown}. Soak overnight.',
   'Heat the oven to 170C. Line a 900 g loaf tin.',
   'Beat {egg-medium} into the fruit.',
   'Stir in {flour-self-raising} and {mixed-spice}.',
   'Bake 1 hour, until a skewer comes out clean.',
   'Cool. Slice and spread with butter.'],
  serves=10, tier='budget', note="The Irish Halloween bread. A ring hidden inside meant a wedding within the year.")

R('caramel-popcorn', 'Caramel popcorn', 'pudding',
  ['popcorn-salted 100g', 'dairy-free-spread 50g', 'sugar-soft-brown 100g', 'golden-syrup 3tbsp', 'bicarbonate-of-soda 0.5tsp'],
  ['Heat the oven to 150C. Spread {popcorn-salted} in a large tin.',
   'Melt {dairy-free-spread}, {sugar-soft-brown} and {golden-syrup}. Boil 3 minutes.',
   'Take off the heat. Stir in {bicarbonate-of-soda}. It will foam.',
   'Pour over the popcorn. Toss to coat.',
   'Bake 15 minutes, stirring once, until crisp. Cool.'],
  serves=8, tier='budget')

R('spiced-pumpkin-loaf', 'Vegan spiced pumpkin loaf', 'pudding',
  ['pumpkin 300g', 'vegetable-oil 100ml', 'sugar-soft-brown 150g', 'maple-syrup 3tbsp', 'flour-self-raising 250g', 'mixed-spice 2tsp', 'bicarbonate-of-soda 0.5tsp', 'pecans 50g'],
  ['Heat the oven to 180C. Line a 900 g loaf tin.',
   'Grate {pumpkin} finely.',
   'Whisk {vegetable-oil}, {sugar-soft-brown} and {maple-syrup}. Stir in the pumpkin.',
   'Fold in {flour-self-raising}, {mixed-spice} and {bicarbonate-of-soda}.',
   'Stir in chopped {pecans}.',
   'Bake 55 minutes, until a skewer comes out clean.'],
  serves=10, tier='budget')

R('blood-orange-sorbet', 'Blood orange sorbet', 'pudding',
  ['orange-juice 600ml', 'sugar-caster 150g', 'lemon 1', 'raspberries 100g'],
  ['Warm half of {orange-juice} with {sugar-caster} until the sugar dissolves.',
   'Blend with {raspberries} for a deep blood red. Sieve.',
   'Stir in the rest of the juice and the juice of {lemon}. Freeze in a shallow box 1 hour.',
   'Fork through. Freeze 3 hours more, forking every hour.'],
  serves=6, tier='budget')

# ---- Drinks ----
R('potion', 'Blood-red potion', 'drink',
  ['cranberry-juice 600ml', 'orange-juice 300ml', 'lime 1', 'sparkling-water 1'],
  ['Mix {cranberry-juice} and {orange-juice} in a jug.',
   'Add the juice of {lime}.',
   'Top up with {sparkling-water} and ice.'],
  serves=6, tier='budget')

R('pumpkin-spice-milk', 'Pumpkin spice hot milk', 'drink',
  ['milk-whole 800ml', 'pumpkin 100g', 'maple-syrup 3tbsp', 'cinnamon-ground 1tsp', 'ginger-ground 0.5tsp', 'nutmeg 0.25tsp'],
  ['Steam {pumpkin} 10 minutes until soft. Blend with a little of {milk-whole}.',
   'Warm with the rest of the milk.',
   'Whisk in {maple-syrup}, {cinnamon-ground}, {ginger-ground} and {nutmeg}.',
   'Pour into mugs.'],
  serves=4, tier='budget')

R('vampires-kiss', "Vampire's kiss", 'drink',
  ['cranberry-juice 200ml', 'raspberries 60g', 'sparkling-wine 750ml'],
  ['Put a few {raspberries} in each glass.',
   'Add a splash of {cranberry-juice}.',
   'Top up with chilled {sparkling-wine}.'],
  serves=6, tier='everyday')

R('dark-and-stormy', 'Dark and stormy', 'drink',
  ['spirit-40 200ml', 'ginger-beer 800ml', 'lime 2'],
  ['Fill 4 glasses with ice.',
   'Pour in {ginger-beer}.',
   'Float {spirit-40} on top.',
   'Add a wedge of {lime}.'],
  serves=4, tier='everyday', note='The spirit is dark rum.')

# ---- Menus ----
POT = ('Blood-red potion', 'hal-potion')
SPICE = ('Pumpkin spice hot milk', 'hal-pumpkin-spice-milk')
VAMP = ("Vampire's kiss", 'hal-vampires-kiss')
STORM = ('Dark and stormy', 'hal-dark-and-stormy')

M('cauldron-night', "Witch's cauldron night", 'meat', 6, 'Mummy sausages, cauldron chilli, chocolate graveyard pots.',
  ('hal-mummy-sausages', POT, 'A cold lager'),
  ('hal-cauldron-chilli', SPICE, 'A Zinfandel or Malbec', ['hal-chilli-corn']),
  ('hal-graveyard-pots', 'Cold milk', VAMP))
M('bonfire-night', 'Bonfire night', 'meat', 4, 'Sticky bat wings, bonfire hot dogs, toffee apples.',
  ('hal-bat-wings', POT, 'A dark lager'),
  ('hal-bonfire-hot-dogs', SPICE, 'A mug of warm spiced cider', ['hal-roast-pumpkin-seeds', 'hal-blood-slaw']),
  ('hal-toffee-apples', 'Hot chocolate', STORM))
M('pumpkin-supper', 'Pumpkin patch supper', 'meat', 4, 'Spiced pumpkin soup, chicken pumpkin and sage traybake, pumpkin pie.',
  ('hal-pumpkin-soup', POT, 'A Viognier'),
  ('hal-pumpkin-chicken-traybake', SPICE, 'A Pinot Noir', ['hal-colcannon']),
  ('hal-pumpkin-pie', 'Hot milk', VAMP))
M('blackened-salmon-night', 'Blackened salmon', 'fish', 4, 'Crispy fish bones, blackened salmon with pumpkin mash, blood orange sorbet.',
  ('hal-fish-bones', POT, 'A Sauvignon Blanc'),
  ('hal-blackened-salmon', SPICE, 'A Pinot Noir, lightly chilled', ['hal-blood-slaw']),
  ('hal-blood-orange-sorbet', 'Sparkling water with lime', VAMP))
M('kedgeree-night', 'Kedgeree supper', 'fish', 4, 'Spiced pumpkin soup, smoked haddock kedgeree, barmbrack.',
  ('hal-pumpkin-soup', POT, 'A dry Riesling'),
  ('hal-kedgeree', 'Cloudy apple juice', 'An off-dry Gewürztraminer'),
  ('hal-barmbrack', 'A pot of tea', 'A small glass of Irish whiskey'))
M('swamp-gumbo', 'Swamp gumbo', 'shellfish', 4, "Devil's prawns, prawn gumbo, caramel popcorn.",
  ("hal-devils-prawns", POT, 'A chilled fino sherry'),
  ('hal-prawn-gumbo', SPICE, 'A cold lager', ['hal-chilli-corn']),
  ('hal-caramel-popcorn', 'Hot chocolate', STORM))
M('eyeball-spaghetti', 'Spooky spaghetti night', 'vegetarian', 4, 'Halloumi fries, spaghetti with mozzarella eyeballs, chocolate graveyard pots.',
  ('hal-halloumi-fries', POT, 'A dry rosé'),
  ('hal-spooky-spaghetti', SPICE, 'A Chianti'),
  ('hal-graveyard-pots', 'Cold milk', VAMP))
M('jacket-bonfire', 'Bonfire jackets', 'vegetarian', 4, 'Beetroot hummus, cheese and bean jacket potatoes, toffee apples.',
  ('hal-beetroot-blood-hummus', POT, 'A dry cider'),
  ('hal-bonfire-jackets', SPICE, 'A mug of warm spiced cider', ['hal-blood-slaw']),
  ('hal-toffee-apples', 'Hot chocolate', STORM))
M('squash-halves', 'Stuffed squash supper', 'vegetarian', 4, 'Spiced pumpkin soup, baked squash with feta and lentils, pumpkin pie.',
  ('hal-pumpkin-soup', POT, 'A Viognier'),
  ('hal-stuffed-squash', SPICE, 'A Pinot Noir', ['hal-colcannon']),
  ('hal-pumpkin-pie', 'Hot milk', VAMP))
M('risotto-vegan', 'Pumpkin risotto night', 'vegan', 4, 'Graveyard guacamole, roast pumpkin risotto, blood orange sorbet.',
  ('hal-graveyard-guacamole', POT, 'A cold lager'),
  ('hal-vegan-pumpkin-risotto', 'Sparkling water with lime', 'An oaked Chardonnay'),
  ('hal-blood-orange-sorbet', 'Mint tea', VAMP))
M('bonfire-vegan', 'Vegan bonfire night', 'vegan', 4, 'Beetroot hummus, plant sausage hot dogs, toffee apples.',
  ('hal-beetroot-blood-hummus', POT, 'A dry cider'),
  ('hal-vegan-hot-dogs', 'Hot spiced apple juice', 'A dark lager', ['hal-roast-pumpkin-seeds', 'hal-blood-slaw']),
  ('hal-toffee-apples', 'Hot oat milk with cinnamon', STORM))
M('cauldron-vegan', 'Lentil cauldron', 'vegan', 6, 'Graveyard guacamole, red lentil cauldron stew, spiced pumpkin loaf.',
  ('hal-graveyard-guacamole', POT, 'A Mexican-style lager with lime'),
  ('hal-lentil-cauldron-stew', 'Cloudy apple juice', 'A Côtes du Rhône'),
  ('hal-spiced-pumpkin-loaf', 'Hot oat milk with cinnamon', STORM))
