import pytest

from phieu_co.nguon.lichess import doc_link


@pytest.mark.parametrize("link, mong", [
    ("https://lichess.org/study/TqmJP6yk", ("TqmJP6yk", None)),
    ("https://lichess.org/study/jcblcsmR/DOeAa4aD", ("jcblcsmR", "DOeAa4aD")),
    ("lichess.org/study/jcblcsmR/DOeAa4aD#12", ("jcblcsmR", "DOeAa4aD")),
    ("  https://lichess.org/study/embed/jcblcsmR/DOeAa4aD?theme=auto ", ("jcblcsmR", "DOeAa4aD")),
    ("TqmJP6yk", ("TqmJP6yk", None)),
])
def test_doc_link(link, mong):
    assert doc_link(link) == mong


@pytest.mark.parametrize("link", ["https://lichess.org/abcdefgh", "https://lichess.org/study/ngan", "xin chao"])
def test_link_sai(link):
    with pytest.raises(SystemExit):
        doc_link(link)
