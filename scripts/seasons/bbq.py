# scripts/seasons/bbq.py — 27 Nov 2026 v1
# Barbecue: skewers, ribs, pulled pork and burgers, grilled fish and
# vegetables, salads to go beside them and puddings off the grill.
# Every recipe also works on a griddle pan or under a hot grill indoors.
from build import Book

b = Book('bbq', 'BBQ', 'bbq')
R, M = b.R, b.M

# ---- Starters ----
R('sticky-wings', 'Sticky barbecue chicken wings', 'starter',
  ['chicken-wings 16', 'bbq-sauce 90g', 'smoked-paprika 1tsp', 'garlic-powder 1tsp', 'spring-onion 2'],
  ['Toss {chicken-wings} with {smoked-paprika} and {garlic-powder}.',
   'Cook over medium coals 25 minutes, turning often, until cooked through.',
   'Brush with {bbq-sauce}. Cook 5 minutes more, turning, until sticky and charred.',
   'Scatter with sliced {spring-onion}.'],
  serves=6, tier='budget', note='Sauce goes on at the end. Sugar burns if it goes on early.')

R('halloumi-skewers', 'Halloumi, pepper and onion skewers', 'starter',
  ['halloumi 2', 'pepper-bell 2', 'red-onion 1', 'olive-oil 2tbsp', 'dried-oregano 1tsp', 'lemon 1'],
  ['Cut {halloumi}, {pepper-bell} and {red-onion} into chunks.',
   'Thread onto skewers.',
   'Brush with {olive-oil}. Sprinkle with {dried-oregano}.',
   'Grill over hot coals 8 minutes, turning, until charred.',
   'Squeeze over {lemon}.'],
  serves=4, tier='everyday', note='Soak wooden skewers in water 30 minutes first so they do not burn.')

R('flatbreads', 'Grilled garlic flatbreads', 'starter',
  ['flour-self-raising 300g', 'baking-powder 1tsp', 'olive-oil 5tbsp', 'garlic-clove 2', 'fresh-parsley 10g', 'salt 0.5tsp'],
  ['Mix {flour-self-raising}, {baking-powder} and {salt}. Add 2 tbsp of {olive-oil} and 180 ml warm water.',
   'Knead 2 minutes to a soft dough. Split into 6.',
   'Roll each thin.',
   'Grill over hot coals 2 minutes each side, until puffed and charred.',
   'Crush {garlic-clove} into the rest of the oil with chopped {fresh-parsley}. Brush over.'],
  serves=6, tier='budget')

R('baba-ganoush', 'Smoky aubergine dip', 'starter',
  ['aubergine 2', 'tahini 3tbsp', 'lemon 1', 'garlic-clove 1', 'olive-oil 2tbsp', 'pomegranate-seeds 40g', 'pitta-bread 4'],
  ['Put {aubergine} whole on hot coals. Turn every few minutes for 20 minutes, until black and collapsed.',
   'Cool. Scoop out the soft flesh. Throw away the skin.',
   'Mash with {tahini}, the juice of {lemon} and crushed {garlic-clove}.',
   'Spoon into a bowl. Drizzle with {olive-oil}. Scatter {pomegranate-seeds}.',
   'Grill {pitta-bread} 1 minute a side. Serve for dipping.'],
  serves=6, tier='budget', note='The charred skin is where the smoke comes from.')

R('prawn-skewers', 'Garlic and chilli prawn skewers', 'starter',
  ['king-prawns-raw 400g', 'olive-oil 3tbsp', 'garlic-clove 2', 'chilli-flakes 0.5tsp', 'lemon 1', 'fresh-parsley 10g'],
  ['Mix {olive-oil}, crushed {garlic-clove}, {chilli-flakes} and the zest of {lemon}.',
   'Toss {king-prawns-raw} in it. Leave 15 minutes.',
   'Thread onto skewers.',
   'Grill over hot coals 2 minutes each side, until pink.',
   'Squeeze over the lemon. Scatter {fresh-parsley}.'],
  serves=4, tier='special')

R('grilled-mackerel', 'Grilled mackerel with lemon and herbs', 'starter',
  ['mackerel-fillet 4', 'olive-oil 1tbsp', 'lemon 1', 'fresh-parsley 10g', 'salt 0.5tsp'],
  ['Slash the skin of {mackerel-fillet} 3 times. Rub with {olive-oil} and {salt}.',
   'Grill skin side down over hot coals 3 minutes, until crisp.',
   'Turn. Cook 1 minute more.',
   'Squeeze over {lemon}. Scatter chopped {fresh-parsley}.'],
  serves=4, tier='budget')

R('chorizo-skewers', 'Chorizo and pepper skewers', 'starter',
  ['chorizo 200g', 'pepper-bell 2', 'red-onion 1', 'olive-oil 1tbsp', 'fresh-parsley 5g'],
  ['Cut {chorizo} into chunks. Cut {pepper-bell} and {red-onion} into squares.',
   'Thread onto skewers.',
   'Brush with {olive-oil}.',
   'Grill 8 minutes, turning, until the chorizo sizzles.',
   'Scatter {fresh-parsley}.'],
  serves=6, tier='everyday')

R('charred-corn-salsa-cups', 'Charred corn and bean salsa', 'starter',
  ['corn-on-the-cob 3', 'black-beans-tinned 1', 'red-onion 1', 'lime 2', 'fresh-coriander 10g', 'tortilla-chips 150g'],
  ['Grill {corn-on-the-cob} 10 minutes, turning, until charred.',
   'Cut the kernels off the cobs.',
   'Mix with drained {black-beans-tinned}, chopped {red-onion} and the juice of {lime}.',
   'Stir in {fresh-coriander}.',
   'Serve with {tortilla-chips}.'],
  serves=6, tier='budget')

# ---- Mains ----
R('pulled-pork', 'Pulled pork buns', 'main',
  ['pork-shoulder 2000g', 'smoked-paprika 2tbsp', 'sugar-soft-brown 2tbsp', 'garlic-powder 1tsp', 'salt 2tsp', 'cider-dry 250ml', 'bbq-sauce 150g', 'burger-bun 8'],
  ['Heat the oven to 150C. Mix {smoked-paprika}, {sugar-soft-brown}, {garlic-powder} and {salt}.',
   'Rub all over {pork-shoulder}. Sit in a roasting tin. Pour in {cider-dry}.',
   'Cover tightly with foil. Cook 6 hours, until it falls apart.',
   'Shred with two forks. Throw away the fat.',
   'Stir through {bbq-sauce} and some of the juices.',
   'Pile into {burger-bun}.'],
  serves=8, tier='everyday', note='Cook it the day before. It reheats on the barbecue in a foil parcel.')

R('sticky-ribs', 'Sticky pork ribs', 'main',
  ['pork-ribs 900g', 'smoked-paprika 1tbsp', 'sugar-soft-brown 2tbsp', 'garlic-powder 1tsp', 'bbq-sauce 150g', 'honey 2tbsp', 'apple-juice 150ml'],
  ['Heat the oven to 150C. Rub {pork-ribs} with {smoked-paprika}, {sugar-soft-brown} and {garlic-powder}.',
   'Wrap in foil with {apple-juice}. Cook 2 hours 30 minutes, until tender.',
   'Mix {bbq-sauce} and {honey}.',
   'Unwrap the ribs. Brush with the glaze.',
   'Finish over medium coals 10 minutes, turning and brushing, until sticky and charred.'],
  serves=4, tier='everyday', note='900 g of meat is a rack of about 1.5 kg on the bone.')

R('peri-peri-chicken', 'Spatchcock peri-peri chicken', 'main',
  ['chicken-whole 1500g', 'chilli-fresh 2', 'garlic-clove 3', 'smoked-paprika 2tsp', 'lemon 1', 'olive-oil 3tbsp', 'dried-oregano 1tsp'],
  ['Turn {chicken-whole} breast down. Cut out the backbone with scissors. Press flat.',
   'Blend {chilli-fresh}, {garlic-clove}, {smoked-paprika}, the juice of {lemon}, {olive-oil} and {dried-oregano}.',
   'Rub all over the chicken. Leave 1 hour.',
   'Grill skin side up over medium coals with the lid on 25 minutes.',
   'Turn. Cook 20 minutes more, until the juices run clear.',
   'Rest 10 minutes before cutting.'],
  serves=4, tier='everyday', note='Indoors: roast at 200C for 45 minutes.')

R('brisket', 'Smoky beef brisket', 'main',
  ['beef-brisket 1800g', 'smoked-paprika 2tbsp', 'sugar-muscovado 2tbsp', 'black-pepper-ground 1tbsp', 'salt 2tsp', 'onion-large 2', 'stock-cube 1', 'bbq-sauce 100g'],
  ['Heat the oven to 140C. Mix {smoked-paprika}, {sugar-muscovado}, {black-pepper-ground} and {salt}.',
   'Rub over {beef-brisket}.',
   'Slice {onion-large}. Put in a tin. Sit the beef on top. Add {stock-cube} in 300 ml water.',
   'Cover with foil. Cook 6 hours, until it pulls apart.',
   'Brush with {bbq-sauce}. Char over hot coals 5 minutes a side.',
   'Slice across the grain.'],
  serves=8, tier='special')

R('chilli-lime-salmon', 'Chilli and lime salmon parcels', 'main',
  ['salmon-fillet 4', 'lime 2', 'chilli-fresh 1', 'garlic-clove 1', 'soy-sauce 2tbsp', 'honey 1tbsp', 'fresh-coriander 10g'],
  ['Lay each of {salmon-fillet} on a square of foil.',
   'Mix the juice of {lime}, chopped {chilli-fresh}, crushed {garlic-clove}, {soy-sauce} and {honey}.',
   'Spoon over the fish. Fold the foil into loose parcels.',
   'Cook on the barbecue 12 minutes, until the fish flakes.',
   'Open carefully. Scatter {fresh-coriander}.'],
  serves=4, tier='everyday')

R('tuna-steak-salsa', 'Grilled tuna steaks with mango salsa', 'main',
  ['tuna-steak 4', 'olive-oil 1tbsp', 'mango 1', 'red-onion 1', 'chilli-fresh 1', 'lime 1', 'fresh-coriander 10g'],
  ['Dice {mango}. Mix with chopped {red-onion}, {chilli-fresh}, {fresh-coriander} and the juice of {lime}.',
   'Brush {tuna-steak} with {olive-oil}.',
   'Grill over very hot coals 90 seconds a side, for pink in the middle.',
   'Serve with the salsa.'],
  serves=4, tier='special', note='Tuna dries out fast. Take it off while the middle is still pink.')

R('prawn-pineapple-tacos', 'King prawn and pineapple tacos', 'main',
  ['king-prawns-raw 400g', 'smoked-paprika 1tsp', 'olive-oil 1tbsp', 'pineapple 1', 'tortilla-wrap 8', 'red-cabbage 150g', 'lime 2', 'soured-cream 150ml'],
  ['Toss {king-prawns-raw} with {smoked-paprika} and {olive-oil}. Thread onto skewers.',
   'Cut a quarter of {pineapple} into rings.',
   'Grill the pineapple 2 minutes a side and the prawns 2 minutes a side.',
   'Chop the pineapple. Shred {red-cabbage}. Toss the cabbage with the juice of {lime}.',
   'Warm {tortilla-wrap} on the grill 20 seconds a side.',
   'Fill with prawns, pineapple, cabbage and {soured-cream}.'],
  serves=4, tier='everyday')

R('portobello-burgers', 'Portobello and halloumi burgers', 'main',
  ['portobello-mushroom 4', 'olive-oil 2tbsp', 'garlic-clove 1', 'halloumi 1', 'burger-bun 4', 'rocket 40g', 'pesto 60g'],
  ['Brush {portobello-mushroom} with {olive-oil} and crushed {garlic-clove}.',
   'Grill gill side down 4 minutes. Turn. Grill 4 minutes more.',
   'Slice {halloumi} into 4. Grill 2 minutes a side.',
   'Toast {burger-bun} on the grill.',
   'Spread with {pesto}. Fill with mushroom, halloumi and {rocket}.'],
  serves=4, tier='everyday', swaps=[('pesto', 'Most pesto has parmesan in it; look for a vegetarian one if that matters')])

R('paneer-tikka', 'Paneer tikka skewers', 'main',
  ['paneer 2', 'natural-yoghurt 150g', 'garam-masala 2tsp', 'chilli-powder 1tsp', 'ginger-fresh 1tsp', 'pepper-bell 2', 'red-onion 1', 'lemon 1', 'naan-bread 4'],
  ['Mix {natural-yoghurt}, {garam-masala}, {chilli-powder}, {ginger-fresh} and the juice of {lemon}.',
   'Cube {paneer}. Cut {pepper-bell} and {red-onion} into squares.',
   'Coat in the yoghurt. Leave 30 minutes.',
   'Thread onto skewers.',
   'Grill over hot coals 10 minutes, turning, until charred.',
   'Warm {naan-bread} on the grill. Serve together.'],
  serves=4, tier='everyday')

R('tofu-skewers', 'Smoky tofu skewers', 'main',
  ['tofu-firm 2', 'soy-sauce 4tbsp', 'maple-syrup 2tbsp', 'smoked-paprika 2tsp', 'garlic-clove 2', 'courgette 2', 'red-onion 1', 'olive-oil 2tbsp'],
  ['Press {tofu-firm}. Cut into cubes.',
   'Mix {soy-sauce}, {maple-syrup}, {smoked-paprika} and crushed {garlic-clove}. Toss the tofu. Leave 30 minutes.',
   'Cut {courgette} and {red-onion} into chunks.',
   'Thread onto skewers with the tofu. Brush with {olive-oil}.',
   'Grill 10 minutes, turning and brushing with the marinade, until charred.'],
  serves=4, tier='budget')

R('cauliflower-steaks', 'Grilled cauliflower steaks with chimichurri', 'main',
  ['cauliflower-head 2', 'olive-oil 6tbsp', 'smoked-paprika 1tsp', 'fresh-parsley 30g', 'garlic-clove 2', 'chilli-flakes 0.5tsp', 'white-wine-vinegar 2tbsp'],
  ['Cut each of {cauliflower-head} into 2 thick slices through the stalk.',
   'Brush with 2 tbsp of {olive-oil}. Sprinkle {smoked-paprika}.',
   'Grill over medium coals 8 minutes a side, until tender and charred.',
   'Chop {fresh-parsley} and {garlic-clove} finely.',
   'Mix with {chilli-flakes}, {white-wine-vinegar} and the rest of the oil.',
   'Spoon over the steaks.'],
  serves=4, tier='budget', note='Use the leftover florets in a soup or curry.')

R('jerk-veg-skewers', 'Jerk vegetable and pineapple skewers', 'main',
  ['jerk-paste 3tbsp', 'olive-oil 2tbsp', 'sweet-potato 2', 'pepper-bell 2', 'pineapple 1', 'red-onion 1', 'lime 1', 'rice-basmati-dry 300g', 'kidney-beans-tinned 1'],
  ['Dice {sweet-potato}. Boil 5 minutes. Drain.',
   'Mix {jerk-paste} and {olive-oil}. Toss with the potato, chunks of {pepper-bell}, {red-onion} and half of {pineapple}.',
   'Thread onto skewers.',
   'Grill 12 minutes, turning, until charred.',
   'Cook {rice-basmati-dry}. Stir in drained {kidney-beans-tinned}.',
   'Serve with {lime} wedges.'],
  serves=4, tier='budget', note='Check the jerk paste label; most are vegan.')

# ---- Sides ----
R('corn-salad', 'Charred corn and tomato salad', 'side',
  ['corn-on-the-cob 4', 'cherry-tomato 16', 'spring-onion 3', 'lime 1', 'olive-oil 2tbsp', 'fresh-coriander 10g'],
  ['Grill {corn-on-the-cob} 10 minutes, turning, until charred.',
   'Cut off the kernels.',
   'Halve {cherry-tomato}. Slice {spring-onion}.',
   'Toss with the juice of {lime}, {olive-oil} and {fresh-coriander}.'],
  serves=6, tier='budget')

R('coleslaw', 'Classic coleslaw', 'side',
  ['cabbage-white 1', 'carrot-medium 2', 'onion-medium 1', 'mayonnaise 5tbsp', 'white-wine-vinegar 1tbsp'],
  ['Shred a quarter of {cabbage-white} finely.',
   'Grate {carrot-medium}. Slice {onion-medium} very thinly.',
   'Stir {white-wine-vinegar} into {mayonnaise}.',
   'Toss everything together.'],
  serves=8, tier='budget')

R('smoky-beans', 'Smoky barbecue beans', 'side',
  ['olive-oil 1tbsp', 'onion-medium 1', 'smoked-paprika 2tsp', 'cannellini-beans-tinned 2', 'passata 300g', 'sugar-soft-brown 1tbsp', 'mustard-dijon 1tsp', 'white-wine-vinegar 1tbsp'],
  ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.',
   'Add {smoked-paprika}. Fry 1 minute.',
   'Add drained {cannellini-beans-tinned}, {passata}, {sugar-soft-brown}, {mustard-dijon} and {white-wine-vinegar}.',
   'Simmer 20 minutes, until thick.'],
  serves=6, tier='budget')

R('charred-courgettes', 'Charred courgettes with mint', 'side',
  ['courgette 4', 'olive-oil 3tbsp', 'lemon 1', 'fresh-mint 10g', 'chilli-flakes 0.25tsp'],
  ['Slice {courgette} lengthways into strips.',
   'Brush with 1 tbsp of {olive-oil}.',
   'Grill 2 minutes a side, until striped.',
   'Dress with the rest of the oil, the juice of {lemon}, torn {fresh-mint} and {chilli-flakes}.'],
  serves=4, tier='budget')

R('watermelon-cucumber', 'Watermelon and cucumber salad', 'side',
  ['watermelon 600g', 'cucumber 1', 'red-onion 1', 'lime 1', 'fresh-mint 10g'],
  ['Cube {watermelon}. Slice {cucumber}.',
   'Slice {red-onion} thinly.',
   'Toss with the juice of {lime} and torn {fresh-mint}.'],
  serves=6, tier='budget')

# ---- Puddings ----
R('grilled-pineapple', 'Grilled pineapple with rum and lime', 'pudding',
  ['pineapple 1', 'sugar-soft-brown 3tbsp', 'spirit-40 3tbsp', 'lime 1', 'coconut-yoghurt 300g'],
  ['Peel {pineapple}. Cut into thick rings.',
   'Mix {sugar-soft-brown}, {spirit-40} and the juice of {lime}.',
   'Brush over the pineapple.',
   'Grill 3 minutes a side, until caramelised.',
   'Serve warm with {coconut-yoghurt}.'],
  serves=6, tier='budget', note='The spirit is rum. Leave it out for children.')

R('peaches-mascarpone', 'Grilled peaches with honey mascarpone', 'pudding',
  ['peach 4', 'olive-oil 1tbsp', 'mascarpone 250g', 'honey 2tbsp', 'vanilla-extract 1tsp', 'pistachios 30g'],
  ['Halve and stone {peach}. Brush with {olive-oil}.',
   'Grill cut side down 4 minutes, until charred.',
   'Beat {mascarpone} with {honey} and {vanilla-extract}.',
   'Spoon onto the peaches. Scatter chopped {pistachios}.'],
  serves=4, tier='everyday')

R('banana-boats', 'Chocolate banana boats', 'pudding',
  ['banana-medium 4', 'dark-chocolate-70 80g', 'raspberries 80g'],
  ['Slit {banana-medium} lengthways through the skin, not right through.',
   'Push squares of {dark-chocolate-70} and {raspberries} into the slit.',
   'Wrap each in foil.',
   'Cook on the barbecue 8 minutes, until the chocolate melts.',
   'Eat from the skin with a spoon.'],
  serves=4, tier='budget')

R('maple-nectarines', 'Maple grilled peaches with coconut yoghurt', 'pudding',
  ['peach 4', 'maple-syrup 3tbsp', 'cinnamon-ground 0.5tsp', 'coconut-yoghurt 300g', 'pecans 40g'],
  ['Halve and stone {peach}.',
   'Brush with {maple-syrup} mixed with {cinnamon-ground}.',
   'Grill cut side down 4 minutes, until caramelised.',
   'Serve with {coconut-yoghurt}. Scatter chopped {pecans}.'],
  serves=4, tier='budget')

R('key-lime-pie', 'Key lime pie', 'pudding',
  ['digestive-biscuit 12', 'butter-unsalted 80g', 'condensed-milk 397g', 'lime 4', 'egg-yolk 3', 'double-cream 200ml'],
  ['Heat the oven to 170C. Crush {digestive-biscuit}. Mix with melted {butter-unsalted}.',
   'Press into a 23 cm tin. Bake 10 minutes.',
   'Whisk {condensed-milk}, {egg-yolk} and the zest and juice of {lime}.',
   'Pour onto the base. Bake 15 minutes, until barely set.',
   'Chill 3 hours. Top with whipped {double-cream}.'],
  serves=8, tier='everyday')

R('no-bake-cheesecake', 'No-bake strawberry cheesecake', 'pudding',
  ['digestive-biscuit 12', 'butter-unsalted 80g', 'cream-cheese 400g', 'icing-sugar 80g', 'double-cream 200ml', 'vanilla-extract 1tsp', 'strawberries 300g'],
  ['Crush {digestive-biscuit}. Mix with melted {butter-unsalted}. Press into a 20 cm tin.',
   'Beat {cream-cheese}, {icing-sugar} and {vanilla-extract} until smooth.',
   'Whip {double-cream} to soft peaks. Fold in.',
   'Spread over the base. Chill 4 hours, until set.',
   'Top with halved {strawberries}.'],
  serves=8, tier='everyday')

R('vegan-mango-sorbet', 'Mango and lime sorbet', 'pudding',
  ['mango 3', 'sugar-caster 80g', 'lime 2', 'water 150ml'],
  ['Peel and chop {mango}.',
   'Warm {sugar-caster} in {water} until dissolved. Cool.',
   'Blend the mango, syrup and the juice of {lime} until smooth.',
   'Freeze in a shallow box 4 hours, forking every hour.'],
  serves=6, tier='budget')

# ---- Drinks ----
R('strawberry-basil-lemonade', 'Strawberry and basil lemonade', 'drink',
  ['strawberries 200g', 'fresh-basil 5g', 'lemon 3', 'sugar-caster 80g', 'sparkling-water 2'],
  ['Crush {strawberries} and {fresh-basil} with {sugar-caster}.',
   'Add the juice of {lemon}. Sieve into a jug.',
   'Top up with {sparkling-water} and ice.'],
  serves=8, tier='budget')

R('virgin-mojito', 'Virgin mojito', 'drink',
  ['lime 3', 'fresh-mint 15g', 'sugar-caster 3tbsp', 'sparkling-water 1'],
  ['Cut {lime} into wedges. Crush in a jug with {fresh-mint} and {sugar-caster}.',
   'Fill with crushed ice.',
   'Top up with {sparkling-water}.'],
  serves=4, tier='budget')

R('mojito', 'Mojito', 'drink',
  ['lime 3', 'fresh-mint 15g', 'sugar-caster 3tbsp', 'spirit-40 160ml', 'sparkling-water 1'],
  ['Cut {lime} into wedges. Crush in a jug with {fresh-mint} and {sugar-caster}.',
   'Add {spirit-40}. Fill with crushed ice.',
   'Top up with {sparkling-water}.'],
  serves=4, tier='everyday', note='The spirit is white rum.')

R('strawberry-margarita', 'Frozen strawberry margarita', 'drink',
  ['strawberries 300g', 'spirit-40 150ml', 'orange-liqueur 50ml', 'lime 3', 'sugar-caster 2tbsp'],
  ['Hull {strawberries}. Freeze 2 hours.',
   'Blend with {spirit-40}, {orange-liqueur}, the juice of {lime} and {sugar-caster}.',
   'Add a handful of ice. Blend until slushy.',
   'Pour into glasses.'],
  serves=4, tier='everyday', note='The spirit is tequila.')

# ---- Menus ----
LEM = ('Strawberry and basil lemonade', 'bbq-strawberry-basil-lemonade')
VMO = ('Virgin mojito', 'bbq-virgin-mojito')
MOJ = ('Mojito', 'bbq-mojito')
MAR = ('Frozen strawberry margarita', 'bbq-strawberry-margarita')

M('pulled-pork-party', 'Pulled pork party', 'meat', 8, 'Sticky wings, pulled pork buns with slaw and beans, no-bake cheesecake.',
  ('bbq-sticky-wings', LEM, 'A cold American-style pale lager'),
  ('bbq-pulled-pork', VMO, 'A Zinfandel or a hoppy pale ale', ['bbq-coleslaw', 'bbq-smoky-beans', 'bbq-corn-salad']),
  ('bbq-no-bake-cheesecake', 'Iced tea', MAR))
M('ribs-and-wings', 'Ribs and wings', 'meat', 4, 'Chorizo skewers, sticky pork ribs, chocolate banana boats.',
  ('bbq-chorizo-skewers', LEM, 'A cold lager'),
  ('bbq-sticky-ribs', VMO, 'A Shiraz or Zinfandel', ['bbq-coleslaw', 'bbq-corn-salad']),
  ('bbq-banana-boats', 'Cold milk', MOJ))
M('peri-peri-feast', 'Peri-peri feast', 'meat', 4, 'Charred corn salsa, spatchcock peri-peri chicken, grilled pineapple.',
  ('bbq-charred-corn-salsa-cups', VMO, 'A cold lager'),
  ('bbq-peri-peri-chicken', LEM, 'A Portuguese Vinho Verde or a dry rosé', ['bbq-charred-courgettes', 'bbq-watermelon-cucumber']),
  ('bbq-grilled-pineapple', 'Coconut water with lime', MOJ))
M('brisket-feast', 'Brisket feast', 'meat', 8, 'Smoky aubergine dip with flatbreads, smoky brisket, key lime pie.',
  ('bbq-baba-ganoush', LEM, 'A dry rosé'),
  ('bbq-brisket', VMO, 'A Malbec or Zinfandel', ['bbq-smoky-beans', 'bbq-coleslaw']),
  ('bbq-key-lime-pie', 'Iced tea', MAR))
M('salmon-parcels', 'Salmon on the grill', 'fish', 4, 'Grilled mackerel, chilli and lime salmon parcels, grilled peaches with mascarpone.',
  ('bbq-grilled-mackerel', LEM, 'A Sauvignon Blanc'),
  ('bbq-chilli-lime-salmon', VMO, 'An off-dry Riesling', ['bbq-corn-salad', 'bbq-charred-courgettes']),
  ('bbq-peaches-mascarpone', 'Iced tea', MOJ))
M('tuna-grill', 'Tuna and mango', 'fish', 4, 'Grilled mackerel, tuna steaks with mango salsa, mango sorbet.',
  ('bbq-grilled-mackerel', VMO, 'A chilled fino sherry'),
  ('bbq-tuna-steak-salsa', LEM, 'A Provence rosé', ['bbq-watermelon-cucumber']),
  ('bbq-vegan-mango-sorbet', 'Coconut water', MAR))
M('prawn-taco-grill', 'Prawn taco grill', 'shellfish', 4, 'Garlic prawn skewers, prawn and pineapple tacos, key lime pie.',
  ('bbq-prawn-skewers', VMO, 'An Albariño'),
  ('bbq-prawn-pineapple-tacos', LEM, 'A Mexican-style lager with lime', ['bbq-corn-salad']),
  ('bbq-key-lime-pie', 'Iced tea', MAR))
M('halloumi-grill', 'Halloumi grill', 'vegetarian', 4, 'Halloumi skewers, portobello burgers, grilled peaches with mascarpone.',
  ('bbq-halloumi-skewers', LEM, 'A Greek white'),
  ('bbq-portobello-burgers', VMO, 'A dry rosé', ['bbq-coleslaw', 'bbq-corn-salad']),
  ('bbq-peaches-mascarpone', 'Iced tea', MOJ))
M('tikka-grill', 'Tikka on the grill', 'vegetarian', 4, 'Smoky aubergine dip, paneer tikka skewers with naan, mango sorbet.',
  ('bbq-baba-ganoush', VMO, 'A cold lager'),
  ('bbq-paneer-tikka', LEM, 'An off-dry Gewürztraminer', ['bbq-watermelon-cucumber']),
  ('bbq-vegan-mango-sorbet', 'Mango lassi-style yoghurt drink', MAR))
M('cheesecake-grill', 'Garden grill', 'vegetarian', 6, 'Grilled flatbreads, halloumi and portobello burgers, no-bake cheesecake.',
  ('bbq-flatbreads', LEM, 'A Picpoul de Pinet'),
  ('bbq-portobello-burgers', VMO, 'A light Pinot Noir', ['bbq-charred-courgettes', 'bbq-smoky-beans']),
  ('bbq-no-bake-cheesecake', 'Iced tea', MAR))
M('tofu-grill-vegan', 'Vegan barbecue', 'vegan', 4, 'Smoky aubergine dip, smoky tofu skewers, chocolate banana boats.',
  ('bbq-baba-ganoush', LEM, 'A dry rosé'),
  ('bbq-tofu-skewers', VMO, 'A cold lager', ['bbq-corn-salad', 'bbq-smoky-beans']),
  ('bbq-banana-boats', 'Coconut water', MOJ))
M('cauliflower-grill-vegan', 'Cauliflower steaks', 'vegan', 4, 'Grilled garlic flatbreads, cauliflower steaks with chimichurri, maple grilled peaches.',
  ('bbq-flatbreads', VMO, 'A Vinho Verde'),
  ('bbq-cauliflower-steaks', LEM, 'An Argentinian Malbec', ['bbq-charred-courgettes', 'bbq-watermelon-cucumber']),
  ('bbq-maple-nectarines', 'Iced tea', MAR))
M('jerk-grill-vegan', 'Jerk grill', 'vegan', 4, 'Charred corn salsa, jerk vegetable and pineapple skewers, grilled pineapple.',
  ('bbq-charred-corn-salsa-cups', VMO, 'A Caribbean-style lager'),
  ('bbq-jerk-veg-skewers', LEM, 'A fruity Grenache', ['bbq-watermelon-cucumber']),
  ('bbq-grilled-pineapple', 'Coconut water with lime', MOJ))
