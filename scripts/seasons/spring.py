# scripts/seasons/spring.py — 27 Nov 2026 v1
# Spring: asparagus, new potatoes, peas and broad beans, lamb, rhubarb,
# lemon and herbs.
from build import Book

b = Book('spring', 'Spring', 'spr')
R, M = b.R, b.M

# ---- Starters ----
R('asparagus-soldiers', 'Asparagus soldiers with soft-boiled eggs', 'starter',
  ['asparagus 16', 'egg-medium 4', 'butter-unsalted 20g', 'salt 1tsp'],
  ['Put a pan of water on a high heat until it boils.',
   'Lower in {egg-medium}. Boil 6 minutes for runny yolks.',
   'Snap the woody ends off {asparagus}.',
   'Put a frying pan on a medium heat. Add {butter-unsalted}.',
   'Fry the asparagus 4 minutes, turning, until bright green and tender.',
   'Sprinkle with {salt}. Serve with the eggs in cups for dipping.'],
  serves=4, tier='everyday', note='The asparagus should bend a little, not flop.')

R('pea-mint-soup', 'Pea and mint soup', 'starter',
  ['olive-oil 2tbsp', 'onion-medium 1', 'peas-frozen 500g', 'stock-vegetable 800ml', 'fresh-mint 15g', 'black-pepper-ground 0.5tsp'],
  ['Put a large pan on a medium heat. Add {olive-oil}.',
   'Chop {onion-medium}. Fry 8 minutes, until soft and see-through.',
   'Add {peas-frozen} and {stock-vegetable}. Simmer 5 minutes, until the peas are tender.',
   'Take off the heat. Add {fresh-mint} leaves.',
   'Blend until smooth.',
   'Season with {black-pepper-ground}.'],
  serves=4, tier='budget', note='Five minutes is enough. Longer and the peas turn grey.')

R('radish-whipped-feta', 'Radishes with whipped feta and toast', 'starter',
  ['feta 200g', 'greek-yoghurt 100g', 'lemon 1', 'olive-oil 2tbsp', 'radish 16', 'sourdough 4'],
  ['Crumble {feta} into a bowl.',
   'Add {greek-yoghurt} and the juice of {lemon}. Beat until smooth.',
   'Spread on a plate. Pour {olive-oil} over the top.',
   'Halve {radish}.',
   'Toast {sourdough}. Serve the radishes and toast for scooping.'],
  serves=4, tier='everyday')

R('broad-bean-crostini', 'Broad bean, mint and lemon crostini', 'starter',
  ['broad-beans 300g', 'garlic-clove 1', 'lemon 1', 'olive-oil 3tbsp', 'fresh-mint 10g', 'sourdough 4'],
  ['Boil {broad-beans} 4 minutes. Drain and cool under cold water.',
   'Squeeze the bright green beans out of their pale skins. || Fiddly but worth it: the skins are tough.',
   'Crush the beans with a fork. Add the zest and juice of {lemon}.',
   'Stir in {olive-oil} and chopped {fresh-mint}.',
   'Toast {sourdough}. Rub with {garlic-clove} cut in half.',
   'Pile the beans on the toast.'],
  serves=4, tier='everyday')

R('smoked-mackerel-pate', 'Smoked mackerel pâté with oatcakes', 'starter',
  ['smoked-mackerel 200g', 'cream-cheese 150g', 'lemon 1', 'horseradish-sauce 1tbsp', 'chives 10g', 'oatcakes 12'],
  ['Peel the skin off {smoked-mackerel}. Flake into a bowl.',
   'Add {cream-cheese}, {horseradish-sauce} and the juice of {lemon}.',
   'Mash with a fork until mostly smooth.',
   'Snip {chives} over the top.',
   'Serve with {oatcakes}.'],
  serves=4, tier='budget', note='Keeps two days in the fridge, covered.')

R('crab-toast', 'Crab on toast with watercress', 'starter',
  ['crab-white-meat 200g', 'mayonnaise 2tbsp', 'lemon 1', 'chilli-fresh 1', 'sourdough 4', 'watercress 40g'],
  ['Put {crab-white-meat} in a bowl. Pick out any shell.',
   'Add {mayonnaise} and the juice of half of {lemon}.',
   'Chop {chilli-fresh} finely. Stir in.',
   'Toast {sourdough}.',
   'Pile on the crab. Top with {watercress}.'],
  serves=4, tier='special')

R('asparagus-prosciutto', 'Asparagus wrapped in prosciutto', 'starter',
  ['asparagus 16', 'prosciutto 8', 'olive-oil 1tbsp', 'parmesan 20g'],
  ['Heat the oven to 200C.',
   'Snap the woody ends off {asparagus}.',
   'Tear {prosciutto} in half lengthways. Wrap a strip round each spear.',
   'Lay on a tray. Drizzle with {olive-oil}.',
   'Roast 10 minutes, until the ham is crisp.',
   'Grate {parmesan} over.'],
  serves=4, tier='special')

R('lamb-koftas', 'Minted lamb koftas with yoghurt', 'starter',
  ['lamb-mince 300g', 'cumin-ground 1tsp', 'fresh-mint 15g', 'garlic-clove 1', 'natural-yoghurt 150g', 'olive-oil 1tbsp', 'lemon 1'],
  ['Put {lamb-mince} in a bowl with {cumin-ground}.',
   'Chop {fresh-mint}. Add two thirds to the lamb.',
   'Grate in {garlic-clove}. Mix with your hands.',
   'Shape into 12 small sausages.',
   'Fry in {olive-oil} 8 minutes, turning, until browned all over.',
   'Stir the rest of the mint into {natural-yoghurt}. Serve with wedges of {lemon}.'],
  serves=4, tier='everyday')

# ---- Mains ----
R('roast-lamb', 'Roast leg of lamb with rosemary and garlic', 'main',
  ['lamb-leg 1800g', 'garlic-clove 6', 'fresh-rosemary 4', 'olive-oil 2tbsp', 'lemon 1', 'salt 1tsp'],
  ['Take {lamb-leg} out of the fridge an hour before. Heat the oven to 200C.',
   'Cut 12 small slits in the lamb with a sharp knife.',
   'Slice {garlic-clove}. Push a slice and a little {fresh-rosemary} into each slit.',
   'Rub with {olive-oil} and {salt}. Put in a roasting tin.',
   'Roast 1 hour 20 minutes for pink, 1 hour 40 for well done.',
   'Rest under foil 20 minutes. Squeeze over {lemon} to serve. || Resting lets the juices settle back into the meat.'],
  serves=6, tier='special')

R('chicken-tarragon', 'Chicken with leeks, peas and tarragon', 'main',
  ['olive-oil 1tbsp', 'chicken-thigh-boneless 8', 'leek 2', 'stock-chicken 200ml', 'peas-frozen 150g', 'creme-fraiche 200ml', 'fresh-tarragon 10g'],
  ['Put a wide pan on a medium-high heat. Add {olive-oil}.',
   'Brown {chicken-thigh-boneless} 6 minutes, turning once. Lift onto a plate.',
   'Slice {leek}. Fry in the same pan 6 minutes, until soft.',
   'Add {stock-chicken} and return the chicken. Simmer 15 minutes, until cooked through.',
   'Add {peas-frozen}. Cook 3 minutes.',
   'Stir in {creme-fraiche} and chopped {fresh-tarragon}. Warm through.'],
  serves=4, tier='everyday')

R('pork-rhubarb', 'Pork chops with ginger rhubarb', 'main',
  ['pork-chops 4', 'olive-oil 1tbsp', 'rhubarb 300g', 'sugar-soft-brown 1tbsp', 'ginger-fresh 1tbsp', 'salt 0.5tsp'],
  ['Season {pork-chops} with {salt}.',
   'Put a frying pan on a medium-high heat. Add {olive-oil}.',
   'Fry the chops 5 minutes each side, until no longer pink in the middle.',
   'Lift onto a warm plate to rest.',
   'Cut {rhubarb} into short lengths. Add to the pan with {sugar-soft-brown} and {ginger-fresh}.',
   'Cook 5 minutes, until the rhubarb is soft but holds its shape. Spoon over the chops.'],
  serves=4, tier='everyday')

R('salmon-asparagus-traybake', 'Salmon, asparagus and new potato traybake', 'main',
  ['new-potatoes 16', 'olive-oil 2tbsp', 'asparagus 16', 'salmon-fillet 4', 'lemon 1', 'fresh-dill 10g'],
  ['Heat the oven to 200C.',
   'Halve {new-potatoes}. Toss in a roasting tin with {olive-oil}.',
   'Roast 20 minutes, until starting to colour.',
   'Add {asparagus} and {salmon-fillet} to the tin. Slice {lemon} over the fish.',
   'Roast 12 minutes, until the salmon flakes.',
   'Scatter with chopped {fresh-dill}.'],
  serves=4, tier='everyday', note='One tin, one wash-up.')

R('trout-almonds', 'Trout with almonds and brown butter', 'main',
  ['trout-fillet 520g', 'flour-plain 2tbsp', 'butter-unsalted 40g', 'almonds 40g', 'lemon 1', 'fresh-parsley 10g'],
  ['Dust {trout-fillet} in {flour-plain}. Shake off the extra.',
   'Put a large frying pan on a medium heat. Melt half of {butter-unsalted}.',
   'Fry the trout skin side down 3 minutes. Turn and cook 2 minutes more.',
   'Lift onto warm plates.',
   'Add the rest of the butter and {almonds}. Cook 2 minutes, until golden and nutty-smelling.',
   'Add the juice of {lemon} and chopped {fresh-parsley}. Spoon over the fish.'],
  serves=4, tier='special')

R('prawn-pea-linguine', 'Prawn, pea and lemon linguine', 'main',
  ['spaghetti-dry 350g', 'olive-oil 3tbsp', 'garlic-clove 2', 'chilli-fresh 1', 'king-prawns-raw 300g', 'peas-frozen 200g', 'lemon 1', 'fresh-parsley 10g'],
  ['Put a large pan of salted water on to boil.',
   'Cook {spaghetti-dry} for the time on the packet. Keep a mug of the water.',
   'Put a frying pan on a medium heat. Add {olive-oil}.',
   'Slice {garlic-clove} and {chilli-fresh}. Fry 1 minute.',
   'Add {king-prawns-raw} and {peas-frozen}. Cook 3 minutes, until the prawns turn pink.',
   'Add the drained pasta, the zest and juice of {lemon}, and {fresh-parsley}.',
   'Toss, adding pasta water until glossy.'],
  serves=4, tier='everyday')

R('asparagus-pea-risotto', 'Asparagus and pea risotto', 'main',
  ['stock-vegetable 1200ml', 'butter-unsalted 30g', 'onion-medium 1', 'rice-arborio-dry 300g', 'asparagus 12', 'peas-frozen 150g', 'parmesan 50g', 'lemon 1'],
  ['Warm {stock-vegetable} in a pan.',
   'Put a wide pan on a medium heat. Melt {butter-unsalted}.',
   'Chop {onion-medium}. Fry 8 minutes, until soft.',
   'Add {rice-arborio-dry}. Stir 1 minute.',
   'Add the stock a ladle at a time, stirring. Take about 18 minutes.',
   'Cut {asparagus} into short lengths. Add with {peas-frozen} for the last 5 minutes.',
   'Stir in grated {parmesan} and the zest of {lemon}.'],
  serves=4, tier='everyday', note='Wait for each ladle to soak in before the next.')

R('spring-tart', 'Asparagus and goats cheese tart', 'main',
  ['puff-pastry 320g', 'egg-medium 1', 'goats-cheese 150g', 'asparagus 12', 'spring-onion 4', 'olive-oil 1tbsp'],
  ['Heat the oven to 200C. Unroll {puff-pastry} onto a lined tray.',
   'Score a border 2 cm in from the edge. Do not cut through.',
   'Beat {egg-medium}. Brush over the border.',
   'Crumble {goats-cheese} inside the border.',
   'Lay {asparagus} and sliced {spring-onion} on top. Drizzle with {olive-oil}.',
   'Bake 25 minutes, until puffed and golden.'],
  serves=4, tier='everyday')

R('herb-frittata', 'New potato, spinach and feta frittata', 'main',
  ['new-potatoes 10', 'olive-oil 1tbsp', 'spring-onion 4', 'spinach 100g', 'egg-medium 8', 'feta 100g', 'chives 10g'],
  ['Boil {new-potatoes} 15 minutes, until tender. Slice.',
   'Put an ovenproof frying pan on a medium heat. Add {olive-oil}.',
   'Fry the potatoes and sliced {spring-onion} 3 minutes.',
   'Add {spinach}. Stir until wilted.',
   'Beat {egg-medium} with snipped {chives}. Pour into the pan.',
   'Crumble over {feta}. Cook 6 minutes, until the edges set.',
   'Finish under a hot grill 3 minutes, until set in the middle.'],
  serves=4, tier='budget')

R('white-bean-stew', 'Spring vegetable and white bean stew', 'main',
  ['olive-oil 2tbsp', 'leek 2', 'garlic-clove 2', 'cannellini-beans-tinned 2', 'stock-vegetable 500ml', 'asparagus 10', 'peas-frozen 150g', 'lemon 1', 'fresh-parsley 15g'],
  ['Put a large pan on a medium heat. Add {olive-oil}.',
   'Slice {leek}. Fry 8 minutes, until soft.',
   'Slice {garlic-clove}. Fry 1 minute.',
   'Drain {cannellini-beans-tinned}. Add with {stock-vegetable}. Simmer 10 minutes.',
   'Cut {asparagus} into short lengths. Add with {peas-frozen}. Cook 4 minutes.',
   'Stir in the zest of {lemon} and chopped {fresh-parsley}.'],
  serves=4, tier='budget')

R('tofu-greens-noodles', 'Crispy tofu with spring greens and noodles', 'main',
  ['tofu-firm 1', 'cornflour 2tbsp', 'vegetable-oil 2tbsp', 'rice-noodles-dry 200g', 'garlic-clove 2', 'ginger-fresh 1tbsp', 'spring-greens 200g', 'soy-sauce 3tbsp', 'sesame-oil 1tbsp', 'spring-onion 4'],
  ['Press {tofu-firm} between kitchen paper. Cut into cubes.',
   'Toss in {cornflour}.',
   'Fry in {vegetable-oil} 8 minutes, turning, until crisp. Lift out.',
   'Soak {rice-noodles-dry} in boiling water for the time on the packet. Drain.',
   'Fry {garlic-clove} and {ginger-fresh} 1 minute.',
   'Add shredded {spring-greens}. Stir-fry 3 minutes.',
   'Add the noodles, tofu, {soy-sauce} and {sesame-oil}. Toss. Top with sliced {spring-onion}.'],
  serves=4, tier='budget')

R('chickpea-traybake', 'New potato, asparagus and chickpea traybake', 'main',
  ['new-potatoes 20', 'red-onion 1', 'olive-oil 3tbsp', 'chickpeas-tinned 1', 'asparagus 12', 'lemon 1', 'garlic-clove 1', 'fresh-parsley 20g', 'fresh-mint 10g'],
  ['Heat the oven to 200C.',
   'Halve {new-potatoes}. Cut {red-onion} into wedges.',
   'Toss in a tin with 2 tbsp of {olive-oil}. Roast 20 minutes.',
   'Drain {chickpeas-tinned}. Add with {asparagus}. Roast 15 minutes more.',
   'Chop {fresh-parsley}, {fresh-mint} and {garlic-clove} together finely.',
   'Mix with the juice of {lemon} and the rest of the oil. Spoon over.'],
  serves=4, tier='budget')

# ---- Sides ----
R('minted-new-potatoes', 'Minted new potatoes', 'side',
  ['new-potatoes 24', 'olive-oil 2tbsp', 'fresh-mint 10g', 'salt 0.5tsp'],
  ['Put {new-potatoes} in a pan. Cover with cold water and add {salt}.',
   'Bring to the boil. Simmer 15 minutes, until a knife slides in.',
   'Drain. Return to the pan.',
   'Add {olive-oil} and chopped {fresh-mint}. Shake to coat.'],
  serves=6, tier='budget')

R('peas-lettuce', 'Buttered peas with lettuce', 'side',
  ['butter-unsalted 25g', 'spring-onion 4', 'peas-frozen 400g', 'cos-lettuce 150g', 'stock-vegetable 100ml'],
  ['Put a pan on a medium heat. Melt {butter-unsalted}.',
   'Slice {spring-onion}. Fry 2 minutes.',
   'Add {peas-frozen} and {stock-vegetable}. Simmer 4 minutes.',
   'Shred {cos-lettuce}. Stir in until wilted.'],
  serves=6, tier='budget')

R('garlic-spring-greens', 'Spring greens with garlic and lemon', 'side',
  ['spring-greens 400g', 'olive-oil 2tbsp', 'garlic-clove 2', 'lemon 1'],
  ['Shred {spring-greens}, leaving out the thickest stalks.',
   'Put a wide pan on a medium heat. Add {olive-oil}.',
   'Slice {garlic-clove}. Fry 1 minute.',
   'Add the greens and a splash of water. Stir-fry 4 minutes, until tender.',
   'Squeeze over {lemon}.'],
  serves=4, tier='budget')

R('honey-carrots', 'Honey-glazed baby carrots', 'side',
  ['carrot-medium 8', 'butter-unsalted 20g', 'honey 1tbsp', 'fresh-thyme 4'],
  ['Halve {carrot-medium} lengthways.',
   'Put in a pan with {butter-unsalted}, {honey} and a splash of water.',
   'Cover. Cook 8 minutes on a medium heat.',
   'Uncover. Add {fresh-thyme}. Cook 4 minutes, until glossy.'],
  serves=4, tier='budget')

R('radish-cucumber-salad', 'Radish, cucumber and mint salad', 'side',
  ['radish 12', 'cucumber 1', 'fresh-mint 10g', 'white-wine-vinegar 1tbsp', 'olive-oil 2tbsp'],
  ['Slice {radish} and {cucumber} thinly.',
   'Tear in {fresh-mint} leaves.',
   'Whisk {white-wine-vinegar} with {olive-oil}.',
   'Toss with the salad as you serve it.'],
  serves=4, tier='budget')

# ---- Puddings ----
R('rhubarb-crumble', 'Rhubarb crumble', 'pudding',
  ['rhubarb 600g', 'sugar-caster 100g', 'flour-plain 150g', 'butter-unsalted 100g', 'sugar-demerara 50g'],
  ['Heat the oven to 190C.',
   'Cut {rhubarb} into short lengths. Toss with {sugar-caster} in a baking dish.',
   'Rub {butter-unsalted} into {flour-plain} until it looks like breadcrumbs.',
   'Stir in {sugar-demerara}.',
   'Scatter over the rhubarb.',
   'Bake 35 minutes, until golden and bubbling at the edges.'],
  serves=6, tier='budget')

R('rhubarb-fool', 'Rhubarb and ginger fool', 'pudding',
  ['rhubarb 400g', 'sugar-caster 60g', 'stem-ginger 2', 'double-cream 300ml'],
  ['Cut {rhubarb} into short lengths. Put in a pan with {sugar-caster}.',
   'Cook gently 10 minutes, until soft. Cool completely.',
   'Chop {stem-ginger} finely. Stir into the rhubarb.',
   'Whip {double-cream} to soft peaks (it holds a soft curl).',
   'Fold the rhubarb through the cream in ripples.',
   'Chill 1 hour.'],
  serves=4, tier='everyday')

R('lemon-posset', 'Lemon posset', 'pudding',
  ['double-cream 600ml', 'sugar-caster 150g', 'lemon 3'],
  ['Put {double-cream} and {sugar-caster} in a pan.',
   'Bring to the boil. Bubble 3 minutes, stirring.',
   'Take off the heat. Stir in the juice of {lemon}.',
   'Pour into 6 small glasses.',
   'Chill at least 3 hours, until set.'],
  serves=6, tier='everyday', note='The lemon sets the cream. No gelatine needed.')

R('rhubarb-compote', 'Rhubarb and orange compote with coconut yoghurt', 'pudding',
  ['rhubarb 500g', 'sugar-caster 80g', 'orange 1', 'stem-ginger 2', 'coconut-yoghurt 400g'],
  ['Cut {rhubarb} into short lengths.',
   'Put in a pan with {sugar-caster} and the zest and juice of {orange}.',
   'Simmer 8 minutes, until soft but holding its shape.',
   'Chop {stem-ginger}. Stir in. Cool.',
   'Spoon over {coconut-yoghurt}.'],
  serves=4, tier='budget')

R('lemon-elderflower-sorbet', 'Lemon and elderflower sorbet', 'pudding',
  ['sugar-caster 200g', 'water 500ml', 'lemon 4', 'elderflower-cordial 4tbsp'],
  ['Put {sugar-caster} and {water} in a pan. Heat until the sugar dissolves.',
   'Cool. Add the juice of {lemon} and {elderflower-cordial}.',
   'Pour into a shallow box. Freeze 1 hour.',
   'Fork it through to break up the ice.',
   'Freeze 3 hours more, forking every hour, until firm and snowy.'],
  serves=6, tier='budget')

R('strawberries-mint-sugar', 'Strawberries with mint sugar and lime', 'pudding',
  ['strawberries 400g', 'fresh-mint 10g', 'sugar-caster 2tbsp', 'lime 1'],
  ['Hull and halve {strawberries}.',
   'Chop {fresh-mint} with {sugar-caster} until green and fragrant.',
   'Toss the strawberries with the juice of {lime}.',
   'Sprinkle with the mint sugar.'],
  serves=4, tier='budget')

R('lemon-drizzle', 'Lemon drizzle loaf', 'pudding',
  ['butter-unsalted 225g', 'sugar-caster 225g', 'egg-medium 4', 'flour-self-raising 225g', 'lemon 2', 'icing-sugar 100g'],
  ['Heat the oven to 180C. Line a 900 g loaf tin.',
   'Beat {butter-unsalted} with {sugar-caster} until pale.',
   'Beat in {egg-medium} one at a time.',
   'Fold in {flour-self-raising} and the zest of {lemon}.',
   'Bake 45 minutes, until a skewer comes out clean.',
   'Mix the lemon juice with {icing-sugar}. Pour over while warm.'],
  serves=8, tier='budget')

R('gooseberry-fool', 'Gooseberry and elderflower fool', 'pudding',
  ['gooseberries 400g', 'sugar-caster 80g', 'elderflower-cordial 3tbsp', 'double-cream 300ml'],
  ['Top and tail {gooseberries}.',
   'Cook with {sugar-caster} 10 minutes, until they burst. Cool.',
   'Stir in {elderflower-cordial}.',
   'Whip {double-cream} to soft peaks.',
   'Fold the gooseberries through in ripples. Chill 1 hour.'],
  serves=4, tier='everyday')

# ---- Drinks ----
R('elderflower-spritz', 'Elderflower and mint spritz', 'drink',
  ['elderflower-cordial 60ml', 'lime 1', 'fresh-mint 10g', 'sparkling-water 1'],
  ['Put {elderflower-cordial} in a jug.',
   'Add the juice of {lime} and {fresh-mint} leaves.',
   'Top up with {sparkling-water} and ice.'],
  serves=4, tier='budget')

R('rhubarb-soda', 'Rhubarb and ginger soda', 'drink',
  ['rhubarb 300g', 'sugar-caster 100g', 'water 300ml', 'ginger-ale 500ml'],
  ['Chop {rhubarb}. Simmer with {sugar-caster} and {water} 10 minutes.',
   'Strain through a sieve. Cool the pink syrup.',
   'Pour a little into each glass with ice.',
   'Top up with {ginger-ale}.'],
  serves=6, tier='budget')

R('elderflower-gin-fizz', 'Elderflower gin fizz', 'drink',
  ['spirit-40 100ml', 'elderflower-cordial 40ml', 'lemon 1', 'tonic-water 400ml'],
  ['Fill 4 glasses with ice.',
   'Divide {spirit-40} and {elderflower-cordial} between them.',
   'Add a squeeze of {lemon}.',
   'Top up with {tonic-water}.'],
  serves=4, tier='everyday', note='The spirit is gin.')

R('rhubarb-fizz', 'Rhubarb fizz', 'drink',
  ['rhubarb 200g', 'sugar-caster 80g', 'water 200ml', 'sparkling-wine 750ml'],
  ['Chop {rhubarb}. Simmer with {sugar-caster} and {water} 10 minutes.',
   'Strain and chill the syrup.',
   'Put a spoonful in each glass.',
   'Top up with chilled {sparkling-wine}.'],
  serves=6, tier='everyday')

# ---- Menus ----
SOFT = ('Elderflower and mint spritz', 'spr-elderflower-spritz')
RHU = ('Rhubarb and ginger soda', 'spr-rhubarb-soda')
GIN = ('Elderflower gin fizz', 'spr-elderflower-gin-fizz')
FIZZ = ('Rhubarb fizz', 'spr-rhubarb-fizz')

M('spring-lamb-sunday', 'Spring lamb Sunday', 'meat', 6, 'Roast lamb with minted new potatoes and greens, rhubarb crumble to finish.',
  ('spr-pea-mint-soup', SOFT, 'A chilled glass of dry English white, such as Bacchus'),
  ('spr-roast-lamb', RHU, 'A medium red such as Rioja Crianza or Côtes du Rhône', ['spr-minted-new-potatoes', 'spr-garlic-spring-greens', 'spr-honey-carrots']),
  ('spr-rhubarb-crumble', 'Hot custard and a pot of tea', 'A small glass of late-harvest dessert wine'))
M('chicken-tarragon-supper', 'Chicken and tarragon supper', 'meat', 4, 'Creamy tarragon chicken with peas and lettuce, lemon posset after.',
  ('spr-radish-whipped-feta', SOFT, 'A crisp Sauvignon Blanc'),
  ('spr-chicken-tarragon', 'Cloudy apple juice with sparkling water', 'An oaked Chardonnay from Burgundy', ['spr-minted-new-potatoes']),
  ('spr-lemon-posset', 'Chilled mint tea', FIZZ))
M('lamb-kofta-lunch', 'Kofta and pork chop lunch', 'meat', 4, 'Minted lamb koftas, then pork chops with ginger rhubarb.',
  ('spr-lamb-koftas', 'Mint lemonade', 'A dry rosé from Provence'),
  ('spr-pork-rhubarb', RHU, 'A light, juicy red such as Beaujolais', ['spr-peas-lettuce', 'spr-minted-new-potatoes']),
  ('spr-strawberries-mint-sugar', SOFT, FIZZ))
M('salmon-asparagus', 'Salmon and asparagus', 'fish', 4, 'Mackerel pâté, then a salmon and asparagus traybake, gooseberry fool to finish.',
  ('spr-smoked-mackerel-pate', SOFT, 'A dry Riesling'),
  ('spr-salmon-asparagus-traybake', 'Sparkling elderflower pressé', 'A Sancerre or other Loire Sauvignon Blanc'),
  ('spr-gooseberry-fool', 'Cold milk or a pot of tea', GIN))
M('trout-supper', 'Trout and almonds', 'fish', 4, 'Asparagus soldiers, then trout in brown butter with new potatoes.',
  ('spr-asparagus-soldiers', SOFT, 'A glass of English sparkling wine'),
  ('spr-trout-almonds', 'Lemon and ginger iced tea', 'A Chablis or other unoaked Chardonnay', ['spr-minted-new-potatoes', 'spr-garlic-spring-greens']),
  ('spr-lemon-drizzle', 'A pot of Earl Grey', 'A sweet Muscat'))
M('crab-and-prawn', 'Crab and prawn', 'shellfish', 4, 'Crab on toast, then prawn and pea linguine, strawberries to finish.',
  ('spr-crab-toast', SOFT, 'A chilled Albariño'),
  ('spr-prawn-pea-linguine', 'Sparkling water with lemon', 'A Vermentino or Pinot Grigio'),
  ('spr-strawberries-mint-sugar', RHU, FIZZ))
M('spring-garden-risotto', 'Spring garden risotto', 'vegetarian', 4, 'Asparagus soldiers, an asparagus and pea risotto, rhubarb fool.',
  ('spr-asparagus-soldiers', SOFT, 'A Grüner Veltliner'),
  ('spr-asparagus-pea-risotto', 'Sparkling elderflower pressé', 'A Soave or Gavi'),
  ('spr-rhubarb-fool', 'Chilled mint tea', FIZZ))
M('spring-tart-lunch', 'Spring tart lunch', 'vegetarian', 4, 'Broad bean crostini, an asparagus and goats cheese tart, lemon drizzle.',
  ('spr-broad-bean-crostini', SOFT, 'A Picpoul de Pinet'),
  ('spr-spring-tart', 'Cloudy lemonade', 'A Sancerre or Touraine Sauvignon', ['spr-radish-cucumber-salad']),
  ('spr-lemon-drizzle', 'A pot of tea', GIN))
M('frittata-supper', 'Frittata supper', 'vegetarian', 4, 'Whipped feta and radishes, a herby frittata, lemon posset.',
  ('spr-radish-whipped-feta', RHU, 'A dry rosé'),
  ('spr-herb-frittata', SOFT, 'A light Pinot Grigio', ['spr-peas-lettuce']),
  ('spr-lemon-posset', 'Cold milk or a pot of tea', FIZZ))
M('green-spring-supper', 'Green spring supper', 'vegan', 4, 'Pea and mint soup, a spring bean stew, rhubarb and orange compote.',
  ('spr-pea-mint-soup', SOFT, 'A crisp English Bacchus'),
  ('spr-white-bean-stew', 'Sparkling water with cucumber', 'A Vinho Verde', ['spr-garlic-spring-greens']),
  ('spr-rhubarb-compote', RHU, FIZZ))
M('spring-traybake-vegan', 'Spring traybake', 'vegan', 4, 'Broad bean crostini, a chickpea and asparagus traybake, lemon sorbet.',
  ('spr-broad-bean-crostini', SOFT, 'A Grüner Veltliner'),
  ('spr-chickpea-traybake', 'Mint lemonade', 'A dry Provence rosé', ['spr-radish-cucumber-salad']),
  ('spr-lemon-elderflower-sorbet', RHU, GIN))
M('tofu-noodle-night', 'Tofu and greens', 'vegan', 4, 'Pea soup, crispy tofu with spring greens and noodles, strawberries.',
  ('spr-pea-mint-soup', 'Jasmine iced tea', 'A dry Riesling'),
  ('spr-tofu-greens-noodles', SOFT, 'A cold lager'),
  ('spr-strawberries-mint-sugar', RHU, FIZZ))
